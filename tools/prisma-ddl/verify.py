#!/usr/bin/env python3
"""
Independent check: does the live database actually match schema.prisma?

This is the half that makes the hand-authored migration trustworthy. The
generator could be wrong; applying its output only proves the SQL parses.
So this re-reads schema.prisma from scratch and interrogates the PostgreSQL
catalog, asserting in BOTH directions:

  schema -> database   every model, column, type, nullability, enum member,
                       primary key, unique/plain index and foreign key that
                       the schema declares exists in the database
  database -> schema   nothing exists in the database that the schema does
                       not declare

The second direction is the one that catches the dangerous class of bug — a
leftover column or a dropped-and-forgotten index — which a one-way check
happily reports as green.

Usage: DATABASE_URL=... python3 tools/prisma-ddl/verify.py
"""

import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import (  # noqa: E402
    SCALARS,
    column_type,
    extract_call,
    is_relation,
    parse,
    strip_comments,
    SCHEMA,
)

import psycopg2  # noqa: E402

# information_schema spells these differently from the DDL we emit.
CANON = {
    "text": "TEXT",
    "integer": "INTEGER",
    "bigint": "BIGINT",
    "boolean": "BOOLEAN",
    "timestamp without time zone": "TIMESTAMP(3)",
    "double precision": "DOUBLE PRECISION",
    "jsonb": "JSONB",
    "bytea": "BYTEA",
    "numeric": "DECIMAL(65,30)",
    "ARRAY": "ARRAY",
    "USER-DEFINED": "ENUM",
}

failures = []
checks = 0


def check(ok, message):
    global checks
    checks += 1
    if not ok:
        failures.append(message)


def main():
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("DATABASE_URL is not set — refusing to claim the schema is verified.")
        return 2

    text = strip_comments(SCHEMA.read_text(encoding="utf-8"))
    enums, models = parse(text)

    conn = psycopg2.connect(url)
    cur = conn.cursor()

    # PostGIS installs its own tables and views into `public`. They are the
    # extension's, not ours, so they are excluded — but by asking the catalog
    # which objects the extension owns, rather than by hardcoding names that
    # would silently stop excluding the right things on a version bump.
    cur.execute(
        """
        SELECT c.relname
        FROM pg_depend d
        JOIN pg_class c ON c.oid = d.objid
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.deptype = 'e'
        """
    )
    extension_owned = {r[0] for r in cur.fetchall()}

    # Prisma's migration ledger is bookkeeping, not schema. `prisma migrate
    # deploy` creates `_prisma_migrations` and schema.prisma does not
    # declare it, by design — so the verifier reported it as an undeclared
    # table the first time the migration was applied by Prisma rather than
    # by hand. Its name is fixed by Prisma's own protocol and cannot drift
    # the way an extension's contents can, which is why this one is named
    # here while PostGIS's objects are asked for.
    not_declared_here = extension_owned | {"_prisma_migrations"}

    # ---------------- enums ----------------
    cur.execute(
        """
        SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder)
        FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' GROUP BY t.typname
        """
    )
    db_enums = {r[0]: list(r[1]) for r in cur.fetchall()}
    for name, values in enums.items():
        check(name in db_enums, f"enum {name} is missing from the database")
        if name in db_enums:
            check(
                db_enums[name] == values,
                f"enum {name}: database has {db_enums[name]}, schema declares {values}",
            )
    for name in db_enums:
        check(name in enums, f"enum {name} exists in the database but not in the schema")

    # ---------------- tables & columns ----------------
    cur.execute(
        """
        SELECT table_name, column_name, data_type, is_nullable, udt_name
        FROM information_schema.columns WHERE table_schema = 'public'
        """
    )
    db_cols = {}
    for t, c, dt, nullable, udt in cur.fetchall():
        db_cols.setdefault(t, {})[c] = (dt, nullable == "YES", udt)

    db_cols = {t: c for t, c in db_cols.items() if t not in not_declared_here}

    expected_tables = {m["table"]: m for m in models.values()}
    for table, model in expected_tables.items():
        if table not in db_cols:
            check(False, f"table {table} is missing from the database")
            continue
        scalars = [f for f in model["fields"] if not is_relation(f, models)]
        for f in scalars:
            if f["name"] not in db_cols[table]:
                check(False, f"{table}.{f['name']} is missing from the database")
                continue
            dt, is_null, udt = db_cols[table][f["name"]]
            check(
                is_null == f["optional"],
                f"{table}.{f['name']}: database nullable={is_null}, schema optional={f['optional']}",
            )
            want = column_type(f, enums)
            if f["list"]:
                check(dt == "ARRAY", f"{table}.{f['name']}: expected an array, got {dt}")
            elif f["type"] in enums:
                check(
                    dt == "USER-DEFINED" and udt == f["type"],
                    f"{table}.{f['name']}: expected enum {f['type']}, got {dt}/{udt}",
                )
            else:
                check(
                    CANON.get(dt) == want,
                    f"{table}.{f['name']}: expected {want}, database has {dt}",
                )
        declared = {f["name"] for f in scalars}
        for col in db_cols[table]:
            check(
                col in declared,
                f"{table}.{col} exists in the database but is not declared in the schema",
            )

    for table in db_cols:
        if table in not_declared_here:
            continue
        check(table in expected_tables, f"table {table} exists in the database but not in the schema")

    # ---------------- primary keys ----------------
    cur.execute(
        """
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
        """
    )
    db_pks = {}
    for t, c in cur.fetchall():
        db_pks.setdefault(t, []).append(c)
    for table, model in expected_tables.items():
        want = [f["name"] for f in model["fields"] if "@id" in f["attrs"]]
        check(db_pks.get(table) == want, f"{table}: primary key is {db_pks.get(table)}, expected {want}")

    # ---------------- foreign keys ----------------
    cur.execute(
        """
        SELECT tc.table_name, kcu.column_name, ccu.table_name, rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
        """
    )
    db_fks = {(r[0], r[1]): (r[2], r[3]) for r in cur.fetchall()}
    expected_fks = {}
    for model in models.values():
        for f in model["fields"]:
            if not is_relation(f, models):
                continue
            inner = extract_call(f["attrs"], "@relation")
            if not inner or "fields:" not in inner:
                continue
            src = re.search(r"fields:\s*\[([^\]]+)\]", inner).group(1).split(",")[0].strip()
            src_field = next(x for x in model["fields"] if x["name"] == src)
            rule = "SET NULL" if src_field["optional"] else "RESTRICT"
            expected_fks[(model["table"], src)] = (models[f["type"]]["table"], rule)

    for key, want in expected_fks.items():
        got = db_fks.get(key)
        check(got is not None, f"foreign key {key[0]}.{key[1]} is missing from the database")
        if got:
            check(
                got == want,
                f"foreign key {key[0]}.{key[1]}: database -> {got}, expected -> {want}",
            )
    for key in db_fks:
        check(key in expected_fks, f"foreign key {key[0]}.{key[1]} exists in the database but not in the schema")

    # ---------------- indexes ----------------
    cur.execute(
        "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public'"
    )
    # Keyed by index name, but filtered by the TABLE it sits on: an index is
    # not itself recorded as extension-owned even when its table is.
    db_idx = {r[1] for r in cur.fetchall() if r[0] not in not_declared_here}
    expected_idx = set()
    for model in models.values():
        expected_idx.add(model["table"] + "_pkey")
        for f in model["fields"]:
            if "@unique" in f["attrs"] and not is_relation(f, models):
                expected_idx.add(f"{model['table']}_{f['name']}_key")
        for attr in model["block"]:
            m = re.match(r"@@(unique|index)\(\[([^\]]+)\]\)", attr)
            if m:
                cols = [c.strip() for c in m.group(2).split(",")]
                suffix = "_key" if m.group(1) == "unique" else "_idx"
                expected_idx.add(model["table"] + "_" + "_".join(cols) + suffix)
    for name in expected_idx:
        check(name in db_idx, f"index {name} is missing from the database")
    for name in db_idx:
        check(name in expected_idx, f"index {name} exists in the database but not in the schema")

    cur.close()
    conn.close()

    print(f"{checks - len(failures)}/{checks} checks passed")
    if failures:
        print("\nFAILURES:")
        for f in failures[:40]:
            print("  - " + f)
        if len(failures) > 40:
            print(f"  ... and {len(failures) - 40} more")
        return 1
    print("The database matches schema.prisma in both directions.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

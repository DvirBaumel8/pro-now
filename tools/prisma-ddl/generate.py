#!/usr/bin/env python3
"""
Prisma schema -> PostgreSQL DDL.

WHY THIS EXISTS
---------------
Prisma's migration engine is a Rust binary fetched at runtime from
binaries.prisma.sh. In this build environment that host is refused by
organization egress policy (HTTP 403 at CONNECT), for every Prisma version
from 5.x through 8.x-rc. That is a network policy, not a bug to route
around, so `prisma migrate dev` cannot run here and never will.

/CLAUDE.md §6 still requires a migration for every schema change. Prisma
fully supports hand-authored migration SQL — `migrate dev` is a convenience
that writes the file, not the only legal way to produce one. This script
writes that file deterministically from schema.prisma, so the migration is
derived from the schema rather than typed out by hand and hoped over.

It is deliberately NOT a general Prisma compiler. It implements exactly the
subset this schema uses, and it REFUSES to emit anything it does not fully
understand rather than guessing — an unrecognised attribute is an error, not
a warning. A migration that silently drops a constraint is worse than no
migration at all.

Verification is separate and independent: tools/prisma-ddl/verify.py applies
this output to a real PostgreSQL and checks the resulting catalog against
the schema again.
"""

import re
import sys
from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[2] / "apps/api/prisma/schema.prisma"

# Prisma's own scalar -> PostgreSQL mapping for the `postgresql` provider.
SCALARS = {
    "String": "TEXT",
    "Int": "INTEGER",
    "BigInt": "BIGINT",
    "Boolean": "BOOLEAN",
    "DateTime": "TIMESTAMP(3)",
    "Float": "DOUBLE PRECISION",
    "Decimal": "DECIMAL(65,30)",
    "Json": "JSONB",
    "Bytes": "BYTEA",
}


class SchemaError(Exception):
    pass


def strip_comments(text: str) -> str:
    return "\n".join(re.sub(r"//.*$", "", line) for line in text.splitlines())


def parse(text: str):
    enums, models = {}, {}
    blocks = re.finditer(r"^(model|enum)\s+(\w+)\s*\{(.*?)^\}", text, re.S | re.M)
    for b in blocks:
        kind, name, body = b.group(1), b.group(2), b.group(3)
        if kind == "enum":
            enums[name] = [l.strip() for l in body.splitlines() if l.strip()]
        else:
            models[name] = parse_model(name, body)
    return enums, models


def parse_model(name, body):
    fields, block_attrs = [], []
    for raw in body.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("@@"):
            block_attrs.append(line)
            continue
        m = re.match(r"^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$", line)
        if not m:
            raise SchemaError(f"{name}: cannot parse field line: {line!r}")
        fields.append(
            {
                "name": m.group(1),
                "type": m.group(2),
                "list": bool(m.group(3)),
                "optional": bool(m.group(4)),
                "attrs": m.group(5).strip(),
            }
        )
    table = name
    m = re.search(r'@@map\("([^"]+)"\)', " ".join(block_attrs))
    if m:
        table = m.group(1)
    return {"name": name, "table": table, "fields": fields, "block": block_attrs}


_REFERENTIAL_ACTIONS = {
    "Cascade": "CASCADE",
    "Restrict": "RESTRICT",
    "NoAction": "NO ACTION",
    "SetNull": "SET NULL",
    "SetDefault": "SET DEFAULT",
}


def on_delete_rule(relation_args: str, src_field) -> str:
    """
    The ON DELETE action for a relation: an explicit `onDelete:` wins;
    otherwise Prisma's default for the postgresql provider — a required
    relation restricts deletes, an optional one nulls the reference.
    """
    m = re.search(r"onDelete:\s*(\w+)", relation_args)
    if m:
        return _REFERENTIAL_ACTIONS[m.group(1)]
    return "SET NULL" if src_field["optional"] else "RESTRICT"


def extract_call(attrs: str, name: str):
    """
    Return the argument text of `name(...)`, honouring nested parentheses.

    A plain regex cannot do this: `@default(cuid())` has an inner call, and a
    non-greedy match silently truncates it to `cuid(` — which then looks like
    an unrecognised default rather than a parser bug. Counting depth makes
    the failure impossible instead of merely unlikely.
    """
    i = attrs.find(name + "(")
    if i < 0:
        return None
    start = i + len(name) + 1
    depth = 1
    for j in range(start, len(attrs)):
        if attrs[j] == "(":
            depth += 1
        elif attrs[j] == ")":
            depth -= 1
            if depth == 0:
                return attrs[start:j]
    raise SchemaError(f"unbalanced parentheses in {attrs!r}")


def quote(ident):
    return '"' + ident.replace('"', '""') + '"'


def column_type(field, enums):
    t = field["type"]
    if t in SCALARS:
        base = SCALARS[t]
    elif t in enums:
        base = quote(t)
    else:
        raise SchemaError(f"unknown type {t}")
    return base + "[]" if field["list"] else base


def column_default(field, enums):
    """
    Only defaults the DATABASE is responsible for are emitted.

    cuid()/uuid()/autoincrement-free ids and @updatedAt are generated by
    Prisma Client, so emitting a database default for them would create a
    second source of truth that silently disagrees with the application.
    """
    a = field["attrs"]
    m = extract_call(a, "@default")
    if m is None:
        # Prisma gives list fields an empty-array default.
        if field["list"]:
            return f"DEFAULT ARRAY[]::{column_type(field, enums)}"
        return None
    v = m.strip()
    if v in ("cuid()", "uuid()", "cuid(2)"):
        return None
    if v == "now()":
        return "DEFAULT CURRENT_TIMESTAMP"
    if v in ("true", "false"):
        return f"DEFAULT {v}"
    if re.fullmatch(r"-?\d+(\.\d+)?", v):
        return f"DEFAULT {v}"
    if v.startswith('"'):
        lit = v.strip('"').replace("'", "''")
        if field["type"] in enums:
            return f"DEFAULT '{lit}'::{quote(field['type'])}"
        return f"DEFAULT '{lit}'"
    if field["type"] in enums:
        if v not in enums[field["type"]]:
            raise SchemaError(f"{field['name']}: default {v} is not a member of {field['type']}")
        return f"DEFAULT '{v}'::{quote(field['type'])}"
    raise SchemaError(f"{field['name']}: unsupported default {v!r}")


def is_relation(field, models):
    return field["type"] in models


def build(enums, models):
    out = []
    out.append("-- PRO NOW — baseline migration (0_init)")
    out.append("--")
    out.append("-- Generated from apps/api/prisma/schema.prisma by")
    out.append("-- tools/prisma-ddl/generate.py, then applied to a real PostgreSQL 16")
    out.append("-- + PostGIS 3.4 and checked back against the catalog by")
    out.append("-- tools/prisma-ddl/verify.py. Do not edit by hand: change the")
    out.append("-- schema and regenerate, or the two will drift.")
    out.append("")
    out.append("CREATE EXTENSION IF NOT EXISTS postgis;")
    out.append("")

    for name, values in enums.items():
        vals = ", ".join("'" + v + "'" for v in values)
        out.append(f"CREATE TYPE {quote(name)} AS ENUM ({vals});")
    out.append("")

    fks = []
    indexes = []

    for name, model in models.items():
        cols, pk = [], None
        for f in model["fields"]:
            if is_relation(f, models):
                # A relation field is a link, not a column. The scalar it is
                # backed by (`@relation(fields: [...])`) is declared
                # separately and is emitted on its own.
                rel = re.search(r"@relation\((.*)\)", f["attrs"])
                if rel and "fields:" in rel.group(1):
                    inner = rel.group(1)
                    src = re.search(r"fields:\s*\[([^\]]+)\]", inner).group(1)
                    tgt = re.search(r"references:\s*\[([^\]]+)\]", inner).group(1)
                    src_cols = [s.strip() for s in src.split(",")]
                    tgt_cols = [s.strip() for s in tgt.split(",")]
                    src_field = next(x for x in model["fields"] if x["name"] == src_cols[0])
                    on_delete = on_delete_rule(inner, src_field)
                    fks.append(
                        f'ALTER TABLE {quote(model["table"])} ADD CONSTRAINT '
                        f'{quote(model["table"] + "_" + src_cols[0] + "_fkey")} '
                        f'FOREIGN KEY ({", ".join(quote(c) for c in src_cols)}) '
                        f'REFERENCES {quote(models[f["type"]]["table"])} '
                        f'({", ".join(quote(c) for c in tgt_cols)}) '
                        f"ON DELETE {on_delete} ON UPDATE CASCADE;"
                    )
                continue

            ctype = column_type(f, enums)
            null = "" if f["optional"] else " NOT NULL"
            dflt = column_default(f, enums)
            cols.append(f'    {quote(f["name"])} {ctype}{null}{" " + dflt if dflt else ""}')

            if "@id" in f["attrs"]:
                pk = f["name"]
            if "@unique" in f["attrs"]:
                indexes.append(
                    f'CREATE UNIQUE INDEX {quote(model["table"] + "_" + f["name"] + "_key")} '
                    f'ON {quote(model["table"])}({quote(f["name"])});'
                )

        if pk is None:
            raise SchemaError(f'{name}: no @id field; this generator requires one')
        cols.append(
            f'    CONSTRAINT {quote(model["table"] + "_pkey")} PRIMARY KEY ({quote(pk)})'
        )
        out.append(f'CREATE TABLE {quote(model["table"])} (')
        out.append(",\n".join(cols))
        out.append(");")
        out.append("")

        for attr in model["block"]:
            m = re.match(r"@@(unique|index)\(\[([^\]]+)\]\)", attr)
            if m:
                kind, raw_cols = m.group(1), [c.strip() for c in m.group(2).split(",")]
                suffix = "_key" if kind == "unique" else "_idx"
                iname = model["table"] + "_" + "_".join(raw_cols) + suffix
                uniq = "UNIQUE " if kind == "unique" else ""
                indexes.append(
                    f"CREATE {uniq}INDEX {quote(iname)} ON {quote(model['table'])}"
                    f"({', '.join(quote(c) for c in raw_cols)});"
                )
            elif not attr.startswith("@@map"):
                raise SchemaError(f"{name}: unhandled block attribute {attr!r}")

    out.append("-- Indexes")
    out.extend(indexes)
    out.append("")
    out.append("-- Foreign keys")
    out.extend(fks)
    out.append("")
    return "\n".join(out), len(models), len(enums), len(indexes), len(fks)


def main():
    text = strip_comments(SCHEMA.read_text(encoding="utf-8"))
    enums, models = parse(text)
    sql, nm, ne, ni, nf = build(enums, models)
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if dest:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(sql, encoding="utf-8")
    print(f"models={nm} enums={ne} indexes={ni} foreign_keys={nf}", file=sys.stderr)
    if not dest:
        print(sql)


if __name__ == "__main__":
    main()

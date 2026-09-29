# 22 — Working model: the demo and the product

Status: **DECIDED 2026-09-29 by Dvir.** This page says who works on what,
where each person's code lives, and how the product catches up with the
demo. It overrides older wording elsewhere (e.g. "`packages/ui` is shared
by the demo and the apps").

## 1. Two people, two tracks

| | **Amit** | **Dvir** |
|---|---|---|
| Role | Product manager and founder | Senior backend engineer (7 years at Lemonade) |
| Works on | **The demo** — the product script: flows, copy, pricing rules, art, the city, films. He keeps making it more accurate and expanding it. | **The product** — turning the demo into production-ready software (`docs/21-PRODUCTION-PLAN.md`), then keeping it caught up with the demo. |
| Language in sessions | Hebrew, plain words (see `CURRENT-STATE.md §6`) | English, technical |
| Owns | `tools/design-preview/**` | `apps/**`, `packages/**`, `scripts/**` (except demo-only lines), `.github/**`, `docker-compose.yml`, `render.yaml` |

The demo is the **specification by example**: when it shows a new flow or a
new rule, that is product input. The product is not a copy of the demo. It
implements what the demo shows on a real server, with real auth and data,
and it keeps the invariants in `CLAUDE.md`.

## 2. Branching: one branch and one PR per change, merged only on green CI

**DECIDED 2026-09-29 by Dvir; replaces "everyone commits to `master`".**
Several agent sessions work in this repository at once, and two of them
once edited the same file in the same working tree. So every change now
goes through its own branch and a pull request. `master` only receives
PRs whose CI is green.

### The loop, for every session (human or agent)

1. **Own worktree, own branch, from fresh `master`.** Never work in the main
   checkout while another session might be using it.
   ```bash
   git fetch origin
   git worktree add -b <type>/<short-topic> ../pro-now-wt/<short-topic> origin/master
   cd ../pro-now-wt/<short-topic> && npm ci && npm run db:generate -w apps/api
   ```
   `<type>` is one of `feat`, `fix`, `ci`, `docs`, `chore`, `demo`. Example:
   `fix/web-dist-path`. A Claude Code session can use its built-in worktree
   support instead.
2. **Work and check locally**: `npm run lint`, `npm run typecheck`,
   `npm test`, plus `npm run test:int` / `npm run test:e2e` when the change
   touches the API or the web app.
3. **Open the PR and queue it to merge.** Push the branch, open the PR, and
   turn on auto-merge:
   ```bash
   git push -u origin HEAD
   gh pr create --fill --base master
   gh pr merge --auto --squash --delete-branch
   ```
   The PR merges by itself when CI turns green. It is squashed, so each
   change is one commit on `master`.
4. **If CI fails**: read it with `gh pr checks` and `gh run view --log-failed`,
   fix it on the same branch, and push. Never merge around a red check, and
   never weaken a test to get green (CLAUDE.md §6).
5. **If the PR falls behind `master`**, because another PR merged first: run
   `gh pr update-branch` (or `git rebase origin/master` and force-push the
   branch). CI runs again. `master` requires a branch that is up to date
   with it, so a PR is always tested against what it will actually land on.
6. **Clean up after the merge**:
   `git worktree remove ../pro-now-wt/<short-topic>`.

Keep PRs small and single-purpose. A small PR merges quickly, and a quick
merge leaves other sessions little time to conflict with it. Only a few
files are shared across tracks: the root `package.json`, `package-lock.json`,
`docs/18-ROADMAP.md`, `docs/CURRENT-STATE.md` and `CLAUDE.md`. Resolve
conflicts in them by hand. Never resolve them with `--ours` or `--theirs`.

### What CI checks (`.github/workflows/ci.yml`)

| Job | What |
|---|---|
| Lint, typecheck, unit tests | `npm run lint` (with the type-scale, demo-isolation and navigation checks), `typecheck`, `npm test` in every workspace, `verify:domain`, and both builds (demo and web app) |
| Migrations and row lock | migrations on a fresh Postgres + PostGIS, `db:drift`, `verify:rowlock`, `test:int` (every route against a real database, with Mailpit, the mock OIDC server and S3), `db:verify` |
| End-to-end | Playwright on WebKit (iPhone 15) and Chromium against the real server |
| **CI passed** | the one **required** check: green only when all of the above are |

### How it is enforced

- The GitHub ruleset on `master` requires a pull request and a green `CI passed`
  on an up-to-date branch. It forbids force-pushes and deletion. Nobody
  bypasses it. A repository admin applies it once with
  `bash scripts/setup-branch-protection.sh`. The script also turns on
  auto-merge, squash-only merges and branch deletion after merge.
- Render deploys a `master` commit only after its checks pass
  (`autoDeployTrigger: checksPass` in `render.yaml`).

## 3. No shared code

The demo and the product share **no code**:

- The demo has its own copies of the UI and the domain logic:
  `tools/design-preview/lib/ui` (`@pro-now/demo-ui`) and
  `tools/design-preview/lib/types` (`@pro-now/demo-types`). They were forked
  from `packages/ui` and `packages/types` on 2026-09-29, and from then on
  they evolve freely with the demo.
- The product owns `packages/ui` and `packages/types`. Amit's changes never
  reach them directly. They arrive only through a catch-up (§4).
- `scripts/check-demo-isolation.mjs` runs inside `npm run lint` and fails
  in either of two cases:
  - the demo imports a product package or reaches into `packages/`;
  - anything under `apps/`, `packages/` or `scripts/` imports from the demo.

What this means for each person:

- **Amit's sessions** edit only `tools/design-preview/**`, plus the shared
  docs listed in §2 when recording decisions. They never edit `apps/`,
  `packages/` or the production plan. If Amit needs something the demo
  can't express without product code, write it down as a decision in
  `docs/18-ROADMAP.md` and leave it for Dvir.
- **Dvir's sessions** never edit `tools/design-preview/**`, except for
  mechanical fixes needed to keep `npm run lint`, `typecheck` or `test`
  green at the repo root. Record any such fix in the commit message.
- Both sides still run the whole repo's `lint`, `typecheck` and `test`
  before committing. Neither side leaves `master` red for the other.

## 4. Catching up with the demo

### The sync marker

`docs/DEMO-SYNC.md` records the **last demo commit the product has
accounted for**, plus a log of every catch-up. The marker only moves when
a catch-up is recorded there.

### The catch-up procedure

Dvir starts a catch-up by asking for one.

1. **Collect.** Read the marker, then list everything after it:
   ```bash
   git log --reverse --format='%h %ad %s' --date=short <marker>..master -- tools/design-preview docs/18-ROADMAP.md
   ```
   Also read any **DECIDED** / **BUILT** entries added to
   `docs/18-ROADMAP.md` in that range. They often explain the why behind
   the commits.
2. **Classify each commit:**
   - **Product-relevant.** Examples: a new or changed flow or screen,
     customer or pro copy, a pricing or payment rule, a catalogue change
     (services, questions, price lists), a state or timer change, a
     permission, or who-sees-what.
   - **Demo-only.** Examples: 3D city and art, films, QA scripts,
     publishing, demo-bar and fixture tweaks, and performance of the static
     bundle.
   - **Needs a decision.** The demo does something the product cannot do
     without a decision from `CLAUDE.md §4`, such as a vendor, legal or
     money question. Add it to `18-ROADMAP §Open Decisions` and ask.
3. **Plan.** Write `docs/sync/SYNC-<YYYY-MM-DD>.md` with four parts:
   - the range covered;
   - a table of every commit (hash, one line, class, product impact);
   - the product changes, grouped into work items, each mapped to the
     files or epic it touches and sized S/M/L;
   - what is deliberately skipped, and why.

   Dvir reviews the plan before any code is written.
4. **Implement** as ordinary epics (`CLAUDE.md §5`, with the Definition of
   Done in `docs/21 §6`). Porting a screen or rule from
   `tools/design-preview/lib/*` into `packages/*` is allowed. It is a copy
   at that moment, not a link.
   **See the difference, too:** `npm run parity` screenshots the demo and
   the product in the same state and writes `apps/web/parity-report/`
   (demo | product | diff per screen). It is not in CI because the demo
   moves constantly; a catch-up is exactly when it should be run.
5. **Advance the marker.** The marker moves as soon as the plan is
   approved, **not** when the work ships. It means "every demo commit up to
   here has been read and planned". The sync plan tracks whether each item
   is done. Add a log line to `DEMO-SYNC.md`. The next catch-up starts from
   the new marker.

## 5. Claude sessions: who is typing

- Amit writes in Hebrew and commits as `nivamit1210-sketch`. Dvir writes in
  English and commits as `Dvir Baumel`. If it is still unclear who is
  typing, ask before touching code.
- In an Amit session, stay inside §3's boundary. If a request would need
  product code, say so and record it in the roadmap instead.
- In a Dvir session, the default work is `docs/21-PRODUCTION-PLAN.md` epics
  and catch-ups. Do not polish the demo.

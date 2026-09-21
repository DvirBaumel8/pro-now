# 18 — Roadmap, Build Order & Open Decisions

## Build order / epics
```
EPIC 0  — Repository & docs                  (this delivery)
EPIC 1  — Database foundation                 (this delivery, first pass)
EPIC 2  — Auth & account                      (this delivery, first pass)
EPIC 3  — Professional verification            (interfaces + sandbox, this delivery)
EPIC 4  — Customer discovery/request           (this delivery, first pass — mobile UI)
EPIC 5  — Pro services & shift                 (this delivery, first pass — mobile UI)
EPIC 6  — Dispatch                             (this delivery, core engine + tests)
EPIC 7  — Realtime                             (this delivery, WS scaffold)
EPIC 8  — Active job (nav/arrival/service/completion)
EPIC 9  — Pricing/quotes (4 adapters)
EPIC 10 — Payments/ledger (sandbox provider; real vendor after business decision)
EPIC 11 — Reputation (PRO NOW reviews now; external provider after terms validation)
EPIC 12 — Admin/Ops (dashboard + job inspector, this delivery, first pass)
EPIC 13 — Safety/support
EPIC 14 — Analytics/observability
EPIC 15 — Hardening (security/perf/concurrency/offline/a11y/RTL QA)
EPIC 16 — Staging/pilot
EPIC 17 — Production/store readiness
```
Each epic's precise acceptance criteria live in `/docs/19-CLAUDE-RULES.md`.
See `/docs/EPIC-0-REPORT.md` for exactly how far this delivery got through
epics 0–7 and what remains.

## Pilot philosophy
Build broad, launch narrow. `MarketActivation` controls service × geography
× customer-visibility × provider-onboarding × dispatch, independently.
Never market a category before supply density and operational policy are
ready. See `/docs/09b-SERVICE-CATALOG.md` for the seeded pilot candidates.

## Open decisions — human/business/legal, must NOT be invented in code
Israeli payment marketplace provider · KYC/identity provider · exact maps/
routing commercial setup · external Google-reputation implementation/terms
· legal entity and tax/invoice model · commission percentage ·
cancellation fees · provider insurance policy · which credentials are
mandatory by category · background-check policy where lawful · pilot
geography · pilot services beyond the seeded candidates · support hours/
SLA · data retention periods · chat/call masking vendor · analytics vendor
· cloud hosting vendor · final brand/trademark/domain clearance.

Everywhere one of these matters, the codebase exposes an interface + a
labeled sandbox adapter + an `app_config`/roadmap TODO — never a guessed
answer.

### The one that is blocking a real complaint, with the numbers

Amit, on the artifact: *"איפה כל הדברים של כל המקצועות? למה אין, ולא קיים
בקטלוג?"* He is right that it feels thin, and "which services to add" is
on the list above — each one needs a pricing model, a typical duration,
the credentials it mandates, and a judgement about whether it belongs in
a NOW marketplace at all. None of that is an engineering answer.

What IS an engineering answer is the shape of the problem, so the decision
takes a minute instead of an evening. 47 services today, and the imbalance
is the whole story:

| Front door | Services |
| --- | --- |
| לבית | 25 |
| ניקיון | 4 |
| רכב | 4 |
| חיות | 4 |
| ביוטי ושיער | 3 |
| בריאות וכושר | 3 |
| הובלות ומשלוחים | 2 |
| מחשבים וסלולר | 2 |

Half the catalogue is behind one door. A customer who taps "מחשבים
וסלולר" sees two rows and closes the app; a customer who taps "לבית" sees
a wall. Both are the same decision not yet made.

Adding one is a single entry in `packages/types/src/pilot-catalog.ts` —
name, pricing model, typical minutes, required credentials — and the home
grid, the category page, the sentence matcher and the professional's
eligibility list all pick it up, because they are all derived from that
one file. `content-completeness.test.ts` refuses a half-written entry, so
a service cannot be added without the fields that make it work.

## MVP success — two levels
**Technical:** stable end-to-end loop, safe atomic assignment, payment
integrity, trust gating, recovery from every edge case in
`/docs/15-QA-TEST-PLAN.md`.
**Pilot marketplace:** high eligible-supply/match rate, acceptable time-to-
match/ETA, real provider earnings opportunity, completion and repeat
behavior, manageable incident/support rate. No KPI threshold is frozen
before a real pilot baseline exists.

## Final development principle
When there is tension between adding features and making NOW reliable,
choose NOW reliability. The MVP wins when a verified professional can
safely go online, a real nearby customer can request a supported service,
the system reliably matches them, both sides know what's happening, the
professional gets paid correctly, and the marketplace immediately knows the
professional is available again. Everything else is secondary until this
loop works repeatedly in the real world.

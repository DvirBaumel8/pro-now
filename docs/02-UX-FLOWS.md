# 02 — UX Flows (screen-by-screen)

RTL-first, Hebrew copy as specified. This is the authoritative screen list
implemented in `apps/customer-mobile` and `apps/pro-mobile`.

## Customer screens

| ID | Screen | Key content |
|---|---|---|
| C01 | Splash | logo, fast load, session restore, route to onboarding/home/active job |
| C02 | Auth | phone (+972 default, international-ready), OTP, resend timer, abuse protection |
| C03 | Location | explain value before OS permission; current location or manual address; never hard-block browsing |
| C04 | Home | address control; hero "מה צריך עכשיו?"; search; active departments only; "זמין לידך עכשיו" from real supply; recent/reorder; active-job card overrides hero |
| C05 | Department/Service | service cards (icon, plain-language description, pricing archetype); intent search; "לא יודע מה הבעיה" path |
| C06 | Request details | dynamic schema per service: text, photos, short video, voice note, structured questions, access notes, location, courier package fields, hourly duration, variant/add-ons — never ask for irrelevant fields |
| C07 | Price preview | FIXED: exact price+fees. HOURLY: rate/minimum/estimate. VISIT_QUOTE: visit fee prominent + "additional work only after approval". DISTANCE_TIME: pickup/dropoff + basis. Cancellation rules shown before confirm |
| C08 | Searching (signature) | full-screen map/radar from customer location; "מחפשים מקצוען זמין לידך…"; honest state, no fake dots; cancel available; server progressively widens radius |
| C09 | Match found | photo/name, PRO VERIFIED badges, PRO NOW rating + jobs, external rating separately labeled, ETA, price/visit fee, credentials, cancel policy; never expose precise pre-assignment location beyond necessary UX |
| C10 | Live tracking | route/map, live ETA, provider photo/name, status, masked call/chat, support/safety, honest "stale location" state |
| C11 | Arrival | push + in-app; provider cannot silently skip ARRIVED event |
| C12 | Quote (visit+quote) | line items (description/qty/unit/price/labor/materials/tax/total/notes); APPROVE / DECLINE / CHAT; no work-state transition without approval |
| C13 | In service | status, elapsed time for hourly, support |
| C14 | Complete/Payment | final amount, approved additions, payment status, receipt reference, issue/report path |
| C15 | Review | 1–5 stars, optional dimensions (professionalism, punctuality, quality), text, marked as verified-transaction review |

## Professional onboarding screens

| ID | Screen | Key content |
|---|---|---|
| P01 | Pro value | premium visual, "עבוד מתי שנוח לך", CTA "הצטרפו ל-PRO NOW" |
| P02 | Phone/OTP | same identity system as customer |
| P03 | Basic profile | legal name, display-name rules, DOB/eligibility where lawful, real photo |
| P04 | Identity verification | vendor-abstracted KYC: government ID, selfie/liveness, document validity, identity match, manual fallback |
| P05 | Business | trading name, tax/business status, experience, languages, service area, transport/vehicle, public business identity |
| P06 | Profession/services | department → category → service; only admin-activated services selectable; each service can require separate approval |
| P07 | Credentials | dynamic per service trust profile: license/certificate/insurance, issuer, number, expiry, document, status |
| P08 | External reputation | "כבר יש לך מוניטין? חבר אותו" — connect supported external business profile; source labeled separately; no scraping, no merged rating |
| P09 | Portfolio | work examples for relevant categories; moderation/reporting |
| P10 | Service config | pricing inputs allowed by platform, duration, radius (within limits), equipment checklist, add-ons, customer prep notes |
| P11 | Review | checklist of complete/pending items; submission; configurable (not promised) review ETA copy |
| P12 | Approved | "PRO VERIFIED" describes only completed factual checks; CTA to prepare first shift |

## Professional daily UX screens

| ID | Screen | Key content |
|---|---|---|
| P13 | Offline home | dark dashboard; photo/name/badge/rating; today/week earnings; jobs; online hours; net/hour; payout state; huge GO ONLINE; verification/credential alerts |
| P14 | Pre-shift | services active today toggles, radius, zone, equipment readiness, vehicle mode, GPS/background-location readiness; credential issue blocks only the affected service |
| P15 | Online | animated green live ring; ONLINE timer; earnings/jobs; "מחפשים עבורך עבודה"; pause/end shift; safety/support |
| P16 | Offer | full-screen card: service, task summary, approx area, distance, route ETA, expected duration, customer price/visit fee, platform fee, **"את/ה מקבל/ת ₪X"** most prominent, media, requirements, server-driven countdown, ACCEPT/SKIP |
| P17 | Assigned/Navigation | exact destination revealed post-acceptance; navigation handoff; ETA; privacy-safe contact; cancel/problem with reason |
| P18 | Arrived | large ARRIVED action, server timestamp, customer push |
| P19 | Service | FIXED: start→complete. HOURLY: server-authoritative timer + pause rules. VISIT_QUOTE: diagnose→quote→wait→work. COURIER: pickup proof→transit→delivery proof |
| P20 | Complete | required notes/media by policy, final amount rules, customer confirmation where appropriate, payment status |
| P21 | Return to available | automatic AVAILABLE if shift still active and no blocking incident — never force GO ONLINE again |
| P22 | Earnings | today/week/month, gross/fees/tips/net, jobs, online/active hours, net/hour, payouts — never hide deductions |
| P23 | Reputation | PRO NOW rating, completed jobs, dimensions, external reputation separately; complaints not publicly exposed |
| P24 | Verification center | identity/business/credentials-with-expiry/external-links/reverify alerts |

## Prototype priority (build pixel-quality first)
Customer Home → Service selection → Request → Searching → Match → Tracking;
Pro onboarding/verification → Pro Offline → Pre-shift → Online → Offer →
Active job → Earnings. Account/settings screens reuse the same component
system after these are locked.

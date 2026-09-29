# Israel (2026): legal and customary requirements for renovation, improvement and handyman professionals, and how a platform can verify them

Scope: painter, tiler (ריצוף וחיפוי), drywall/plaster (גבס וטיח), carpenter (נגרות), glass & aluminium, waterproofing (איטום), furniture assembly, TV/screen mounting, curtains & rails, handyman (הנדימן), hourly labourer ("זוג ידיים"). Plus working at height (עבודה בגובה) for painters, aluminium, solar and AC installers.
Research date: 2026-09-29. gov.il pages were read directly in a browser (WebFetch is blocked with 403). This is not legal advice. Anything marked "inference" is my reading, not a source's words.

## Q1. רשם הקבלנים: exact threshold, which branches apply, is a handyman exempt, and how to look it up

### Takeaway
You must be registered in פנקס הקבלנים only if you do "engineering construction work" (עבודה הנדסית בנאית) above a set amount **per job**. The official gov.il guide (updated 24.02.2026) gives **more than ₪103,250 per job in a main branch** (ענף ראשי, e.g. 100 בנייה) and **more than ₪54,000 per job in a sub-branch** (ענף משנה, e.g. 131 שיפוצים, 134 איטום מבנים). No trade on this list has its own branch. Painting, tiling, plaster, drywall and similar finishing work fall under 131 שיפוצים (inference). So a painter, tiler or handyman doing a typical home job under ₪54,000 does not have to register. This is not a formal "handyman exemption". The trigger is job value, plus "professional nature" (מהות מקצועית) as the law puts it. The registry is free to query and automatable through a data.gov.il CKAN API.

### Cited Findings
- The law defines "עבודה הנדסית בנאית" as building, **including interior building (בניית פנים)**, roads, bridges, sewerage, drainage, ports and water works. A "contractor" is anyone who takes on such work for someone else. — [חוק רישום קבלנים לעבודות הנדסה בנאיות, תשכ"ט-1969 (Nevo)](https://nevo.co.il/law_html/Law01/P202K1_001.htm)
- Section 14 of the law: engineering construction work whose **financial scope or professional nature** goes beyond what the regulations allow may be done only by a registered contractor. — [Nevo, law text](https://nevo.co.il/law_html/Law01/P202K1_001.htm)
- **Official 2026 thresholds.** The contractors-registrar guide, updated 24.02.2026, says a contractor doing work "בענף ראשי בהיקף כספי של יותר מ-103,250 ₪ לעבודה או ... בענף משנה בהיקף כספי של יותר מ-54,000 ₪" must be registered. It adds that the site is general information only and the law and regulations are binding. — [gov.il: המדריך לרישום בפנקס הקבלנים](https://www.gov.il/he/pages/general_information_for_registration_of_contractors)
- **Conflicting third-party figures (all appear stale; use the gov.il figure):**
  - 83,999 main / 43,583 sub — [nadlancenter](https://www.nadlancenter.co.il/article/6331)
  - 83,939 and 76,000 (search snippets from the same article and similar ones) — [nadlancenter](https://www.nadlancenter.co.il/article/6331)
  - 90,472 main / 47,256 sub — [midrag](https://biz.midrag.co.il/Content/Article/14754)
  - 40,039 — [pro.co.il](https://www.pro.co.il/general-contractors/guide/regulating-the-renovation-industry)
- The sums in the classification regulations are updated **on 1 April and 1 October each year** in line with the building-cost index (תשומות הבנייה). — [תקנות רישום קבלנים (סיווג קבלנים רשומים), תשמ"ח-1988 (Nevo)](https://www.nevo.co.il/law_html/law00/74263.htm)
- **Official branch list** (תקנות ... קביעת ענפים וחלוקת ענפים לענפי משנה, תשנ"ג-1993, as amended; in force since 19.11.2018). Branches relevant here:

  | Branch | Name | Type | Group |
  |---|---|---|---|
  | 100 | בנייה | main | ג |
  | 131 | שיפוצים | sub | א |
  | 132 | עבודות אבן ביבש או ברטוב על קירות מבנים קיימים | sub | ב |
  | 134 | איטום מבנים | sub | ב |
  | 150 | קונסטרוקציות פלדה | sub | — |
  | 160 | חשמלאות ותקשורת במבנים | sub | — |
  | 170 | מתקני מיזוג אויר וקירור | sub | ב |
  | 190 | מתקני תברואה (אינסטלציה) | sub | — |
  | 191 | מתקני אנרגיה סולרית ותאים פוטו-וולטאיים | sub | א |

  There is **no branch** for painting, tiling, plaster/drywall, carpentry, or glass & aluminium. Registration in branches 135, 140, 310 and 700 is no longer possible. — [gov.il: ענפי הרישום בפנקס הקבלנים (updated 27.06.2024)](https://www.gov.il/he/pages/anfey_rishum_pinkas_hakablanim); matches [Nevo 1993 regs](https://www.nevo.co.il/law_html/law00/4779.htm), which list only branch numbers and titles with no description of what 131 includes.
- A law-firm article says replacing floors, restoring walls and replacing frames count as renovation work that needs a registered contractor (subject to the threshold). — [שניאורסון זמיר עו"ד](https://srnlaw.com/%D7%9E%D7%99-%D7%A8%D7%A9%D7%90%D7%99-%D7%9C%D7%91%D7%A6%D7%A2-%D7%A9%D7%99%D7%A4%D7%95%D7%A5/). This is secondary and a legal opinion.
- For a small renovation below the threshold there is no legal duty to hire a registered contractor. The duty sits with the contractor, not the customer. — [pro.co.il guide](https://www.pro.co.il/general-contractors/guide/regulating-the-renovation-industry). Secondary; its figure is stale.
- **Penalty** in the original law: six months' prison or a fine. The Nevo text shows the old amount in lira. — [Nevo](https://nevo.co.il/law_html/Law01/P202K1_001.htm). Secondary sources cite up to ₪100,000 / 2 years — [nadlancenter](https://www.nadlancenter.co.il/article/6331); I did not verify this against the current law text.
- **Official lookup and free API.** The data.gov.il dataset "פנקס הקבלנים הרשומים" has resource id `4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8`. It is queryable through CKAN `datastore_search` with no key. I verified this on 2026-09-29; the dataset was last modified 2026-08-17. — [data.gov.il dataset](https://data.gov.il/dataset/pinkashakablanim) · [resource](https://data.gov.il/dataset/pinkashakablanim/resource/4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8)
  - Fields: `MISPAR_KABLAN` (licence no.), `SHEM_YESHUT`, `MISPAR_YESHUT` (ID/company no.), address, phone, email, `KOD_ANAF`, `TEUR_ANAF`, `KVUTZA`, `SIVUG`, `TARICH_SUG`, `HEKEF`, `KABLAN_MUKAR` (recognised contractor), `OVDIM`, `HEARA`.
  - Example query: `https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&filters={"KOD_ANAF":"131"}`
  - Row counts I measured on 2026-09-29: 131 = 4,913; 134 = 272; 100 = 8,482; 170 = 440; 191 = 86.
- gov.il recommends that anyone ordering work check the registry to confirm registration, **which branches** the contractor may work in, and **at what financial scope**. — [gov.il guide](https://www.gov.il/he/pages/general_information_for_registration_of_contractors)

### Inferences
- **Branch mapping:**
  - Painting, tiling, plaster, drywall, interior carpentry and replacing windows/frames in an existing home most naturally fall under **131 שיפוצים** once a job is over ₪54,000.
  - Waterproofing falls under **134 איטום מבנים**.
  - Stone cladding falls under **132**.
  - Building work, including new construction and extensions, falls under **100** (main branch, ₪103,250).
- **No licence at all, only business (tax) registration:** furniture assembly, TV/screen mounting (mechanical only), curtains & rails, general handyman, and the hourly labourer. These jobs are almost always far below ₪54,000, and furniture assembly or curtain hanging is arguably not "engineering construction work" at all.
- Painters, tilers and plaster/drywall workers need no trade licence. Their only link to the contractors registrar is the job-value threshold.
- **Product rule:**
  - Treat a registrar lookup as **optional/informative** for jobs under ₪54,000.
  - Treat it as **required** only if the platform lets a job's value go above ₪54,000 (renovation/waterproofing) or ₪103,250 (building).
  - PRO NOW's NOW/dispatch jobs are small, so the threshold should rarely be reached. Splitting one large job into several small ones to stay under the threshold is legally risky; no source found either way.
- The registry holds ~18k contractors. Most small tradespeople are not in it, so "not found" must never be shown as a negative trust signal for below-threshold trades.

### Gaps
- I could not find the exact regulation that sets the ₪103,250 / ₪54,000 figures, or confirm that they are indexed on 1 April / 1 October. The 1 April / 1 October rule I found belongs to the **classification** regulations. The gov.il page gives no effective date beyond the page update of 24.02.2026.
- The `HEKEF` field's unit is not documented in what I saw (values such as 1948, 3192, 5332). It is probably thousands of ₪ per classification level, but this is unverified.
- There is no official definition of what 131 שיפוצים includes. Whether painting or furniture/kitchen installation is "engineering construction work" is not settled by any primary source I found.
- The current penalty amount in the law (after updates) was not verified.
- I did not verify the case-law consequences for an unregistered contractor, such as the enforceability of payment claims.

## Q2. Trade by trade: what is legally required, what is customary, the authority, and how to verify

### Takeaway
None of these trades has a trade licence in Israel. The legally required items are:
- tax/business registration (עוסק פטור or מורשה), for everyone;
- contractors-registrar registration, only above the job-value thresholds;
- a working-at-height authorisation, where the work involves a fall risk over 2 m;
- an electrician's licence, if electrical work is involved.

Certificates such as the SII "אוטם מורשה" and manufacturers' "authorised installer" programmes are customary and voluntary.

### Cited Findings
- **Business registration (all trades).**
  - A self-employed person may be a עוסק פטור (exempt dealer) only while annual turnover stays at or under **₪122,833 (2026)**; it was ₪120,000 in 2025.
  - The application is made online at the Tax Authority and opens files for VAT and income tax, and for National Insurance where needed.
  - Some professions must be עוסק מורשה regardless of turnover, including "טכנאי", הנדסאי and מהנדס.
  - [כל-זכות: עוסק פטור](https://www.kolzchut.org.il/he/%D7%A2%D7%95%D7%A1%D7%A7_%D7%A4%D7%98%D7%95%D7%A8)
- **Waterproofing (איטום).**
  - Registration branch **134 איטום מבנים** (sub-branch, group ב). — [gov.il branches](https://www.gov.il/he/pages/anfey_rishum_pinkas_hakablanim)
  - The Standards Institution (מכון התקנים) runs a certification course for "אוטם מורשה" as part of certifying waterproofing contractors under **ת.ת 1752**: 16 sessions plus a practical day. Graduates who meet the certification conditions receive an "אוטם מורשה" certificate. — [SII: קורס הסמכה לאוטם מורשה](https://www.sii.org.il/he/building-8/)
  - The page does not say the certificate is legally required, and does not mention a public list of certified sealers.
- **Glass & aluminium.**
  - Standard **ת"י 1068** (parts 1–2) covers aluminium windows: marking, structure, sealing, hardware, strength, safety and more. — [SII: windows](https://www.sii.org.il/he/windows) · [SII: windows elements](https://www.sii.org.il/he/windows-elements)
  - "מתקין מורשה" (authorised installer) programmes are run by profile manufacturers such as Klil. They are commercial, with warranty conditions, not a state licence. — [Klil authorised installer](https://klil.co.il/%D7%9E%D7%AA%D7%A7%D7%99%D7%9F-%D7%9E%D7%95%D7%A8%D7%A9%D7%94)
  - I found **no** legally mandatory personal certification for aluminium installers.
- **Solar / AC.**
  - Registration branches 191 (solar/PV) and 170 (air conditioning and refrigeration) exist and apply above the sub-branch threshold. — [gov.il branches](https://www.gov.il/he/pages/anfey_rishum_pinkas_hakablanim)
  - Electrical work needs a licence under the Electricity Law and the Electricity (Licences) Regulations 1985, issued by the Ministry of Labour. — [תקנות החשמל (רשיונות), תשמ"ה-1985 (Nevo)](https://www.nevo.co.il/law_html/law01/159_015.htm) · [gov.il: רישוי חשמלאים](https://www.gov.il/he/departments/topics/electricians-licensure/govil-landing-page)
  - Secondary sources say doing electrical work without a licence is a criminal offence and that a licence can be checked by number on a Ministry site. — [abg-group](https://abg-group.co.il/electrical-license-verification/)
- **Painter / tiler / plaster & drywall / carpenter.** No trade-specific licence was found. Relevant branches are 131 (renovations) and 132 (stone cladding), only above ₪54,000 per job. — [gov.il guide](https://www.gov.il/he/pages/general_information_for_registration_of_contractors) · [gov.il branches](https://www.gov.il/he/pages/anfey_rishum_pinkas_hakablanim)

### Inferences — per-trade matrix (for PRO NOW verification design)

| Trade | Legally required | Customary / optional | Automatable verification |
|---|---|---|---|
| Painter | עוסק; working at height where fall risk > 2 m (exteriors, stairwells, balconies) | experience, portfolio, insurance | Registrar API only if > ₪54k; height authorisation = uploaded document plus instructor check |
| Tiler (ריצוף וחיפוי) | עוסק; registrar 131 if > ₪54k (132 for stone cladding) | — | data.gov.il API |
| Drywall / plaster | עוסק; 131 if > ₪54k; height where applicable | — | data.gov.il API |
| Carpenter | עוסק; 131 if > ₪54k (unclear whether built-in carpentry counts) | — | data.gov.il API |
| Glass & aluminium | עוסק; 131 if > ₪54k; **working at height** is typical for window replacement on upper floors | manufacturer "מתקין מורשה" (Klil and others), products to ת"י 1068 | Manufacturer certificates: document upload / manufacturer contact; no public API found |
| Waterproofing | עוסק; **134** if > ₪54k; height/roof work (the "work above roofs" domain) | SII **אוטם מורשה** (ת.ת 1752) | 134 via data.gov.il API; SII certificate = document upload (no public registry found) |
| Furniture assembly · curtains & rails · handyman · labourer | עוסק only (labourer: עוסק, or employment through the platform — outside scope) | — | Tax registration (see Gaps) |
| TV / screen mounting | עוסק only for mechanical mounting; **electrician's licence** if it involves wiring or new sockets | — | Electrician's licence: Ministry of Labour lookup (another researcher may cover this) |

- **Hourly labourer ("זוג ידיים").** If the platform or customer directs the work and pays by the hour, there is a risk that the relationship is classified as employment. This is a legal/business decision and is TBD under CLAUDE.md §4.

### Gaps
- I found no official public, free lookup that confirms a person's עוסק registration status. Tax Authority services exist, but I did not verify an automatable endpoint.
- I found no public registry of SII-certified sealers or of manufacturer-authorised aluminium installers.
- The trade association "איגוד האוטמים" was not researched: no primary source was reached, so I cannot confirm what certification it grants.
- Whether TV mounting on plasterboard or curtain rails ever needs anything beyond business registration: no source says so. This is an inference that it does not.

## Q3. Working at height (עבודה בגובה): who must hold an authorisation, and how to verify it

### Takeaway
Under תקנות הבטיחות בעבודה (עבודה בגובה), תשס"ז-2007, "work at height" is any work, including getting to the workplace, where the worker could fall **more than 2 m**. The worker must be trained by a **registered working-at-height instructor** and hold a **valid authorisation (אישור)** for the specific work domain, valid for **up to 2 years**. The instructor's registration can be checked in the Ministry of Labour's public registry. There is no public registry of individual workers' authorisations, so a platform can only collect the document and check the instructor who signed it. Whether a lone self-employed person working in a private apartment is formally bound is not stated clearly in any source I found.

### Cited Findings
- **Definition (reg. 1).** Any work "שבשלה עלול עובד ליפול לעומק העולה על 2 מטרים", including work from an unguarded surface or work that requires leaning more than 45° over a railing. — [Nevo: תקנות עבודה בגובה 2007](https://www.nevo.co.il/law_html/law00/74164.htm); same in [OSH FAQ booklet, Jan 2017](https://www.osh.org.il/UploadedImages/01_2017/t-202.pdf)
- **Conditions for employing someone at height (reg. 5).** The worker is an adult, has been trained by a working-at-height instructor, and holds a valid authorisation. — [OSH booklet quoting reg. 5](https://www.osh.org.il/UploadedImages/01_2017/t-202.pdf) · [Nevo](https://www.nevo.co.il/law_html/law00/74164.htm)
- **The authorisation (reg. 6).** It covers the domain the worker was trained for and is valid "לתקופה שלא תעלה על שנתיים". The "מבצע" (the party carrying out the work) keeps a valid authorisation for each worker, signed by the instructor. On building works a copy is also held by the work manager (מנהל העבודה). — [OSH booklet quoting reg. 6](https://www.osh.org.il/UploadedImages/01_2017/t-202.pdf)
- **Ministry of Labour (Safety Administration) summary:**
  - Every מבצע must train its workers through a working-at-height instructor **registered in the Administration's registry**.
  - The worker receives an authorisation showing its validity and the permitted domains.
  - The authorisation is given to whoever holds the workplace (מחזיק מקום העבודה), who **must show it to whoever ordered the work or to a labour inspector**.
  - The domains are:
    - ladders
    - personnel lifting baskets
    - elevating platforms and mechanised scaffolds
    - confined spaces
    - above fixed scaffolds
    - **above roofs**
    - above structural frames
    - tree care
    - stages and lighting rigs
  - Refresher training at most every 2 years.
  - Building-façade rope access (גלישת בניין) and mast climbing need training at an approved institution plus an occupational-medicine check.
  - [gov.il: עבודה בגובה (Ministry of Labour)](https://www.gov.il/he/pages/working-height)
- **Scope (reg. 3).** The regulations apply to (1) a מפעל, (2) rope access or mast climbing in a place that is not a מפעל, and (3) work at height **on behalf of a מפעל** in a place that is not a מפעל. — [OSH booklet quoting reg. 3](https://www.osh.org.il/UploadedImages/01_2017/t-202.pdf)
- The OSH booklet says its purpose is to inform organisations "ולעובדים עצמאים" (and self-employed workers) about working at height. — [OSH booklet, Jan 2017](https://www.osh.org.il/UploadedImages/01_2017/t-202.pdf)
- **Registry.** Reg. 54 provides for a registry kept by the Chief Labour Inspector that is open to the public, per a summary of the regulations. — [Nevo](https://www.nevo.co.il/law_html/law00/74164.htm)
- **Registry search engine.** In 2020 the Ministry of Labour launched two search engines: one for service providers (safety and occupational-health role holders, including working-at-height instructors) and one for approved institutions.
  - Search by name, ID, licence number, service-provider type, certification type, or town of residence.
  - The results show when a certification starts and ends, plus current and past appointments.
  - [gov.il news: מנוע חיפוש חדש לאיתור נותני שירות (22.03.2020)](https://www.gov.il/he/pages/search-engine-service-providers)
  - The old engine address `apps.moital.gov.il/OSL/Pages/Person.aspx` ([listed in search results](https://apps.moital.gov.il/OSL/Pages/Person.aspx)) **did not resolve (DNS error) on 2026-09-29**. The current address is unknown.

### Inferences
- **Painters:** interior work on a household ladder where the fall is usually under 2 m is generally **outside** the definition. Exterior façades, stairwells, balconies and scaffold work are **inside** it (ladder or scaffold domain).
- **Aluminium/glass installers** replacing windows or balcony enclosures on upper floors often lean out over a drop of more than 2 m, so the authorisation is relevant.
- **Solar installers** work on roofs ("above roofs" domain). **AC installers** mounting outdoor units on façades or roofs also fall inside.
- **Self-employed workers:** the duties are placed on the "מבצע" towards a "עובד". For a lone self-employed person in a private apartment, formal applicability is unclear. However:
  - the Ministry says the authorisation must be shown to "whoever orders work at height";
  - work in homes is often "building work", and building-work sites are generally treated as a מפעל under the Work Safety Ordinance — I did not verify this against the Ordinance text.

  The conservative product rule: require an uploaded, valid working-at-height authorisation, with domain and expiry date, for services that include façade, balcony, roof, scaffold or exterior work. Check the signing instructor's registration manually or semi-automatically. Store the expiry date and re-prompt before it passes.
- **Verification:** the worker's own authorisation is **not** in any public registry I found. Only instructors and approved institutions are. So verification = document upload + expiry date + an optional check of the instructor's name/number in the Ministry registry. None of this is automatable today (no API found, and the old host is down).

### Gaps
- I could not determine the current URL of the Ministry of Labour's service-provider registry, or whether it offers an API or open data.
- I found no official statement or court ruling on whether a lone self-employed person is bound by the working-at-height regulations when working in a private home. I did not read the definition of "מפעל" in פקודת הבטיחות בעבודה [נוסח חדש].
- I did not verify any regulation changes after 2021 (e.g. updated domains or durations) against the current full Nevo text. The Nevo summary I used could be out of date.

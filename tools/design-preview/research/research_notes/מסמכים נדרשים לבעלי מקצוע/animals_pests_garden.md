# Israel (2026): licences and permits for home-visit animal, pest-control and gardening professionals

Research date: 2026-09-29. Registry figures come from live queries to the data.gov.il CKAN API on that date. gov.il, data.gov.il web pages and kolzchut.org.il returned HTTP 403 / Cloudflare to the fetch tool. For those sites the notes rely on search-result snippets, the open data API, Nevo, and municipal copies of the Business Licensing Order. Each such case is flagged.

---

## Q1. The exact names and URLs of the vet registry and the exterminator registry, and what each one shows

### Takeaway
Both registries are official and free, and both can be queried by machine through the data.gov.il CKAN `datastore_search` API. The **exterminator registry** is strong enough to gate dispatch. It holds licence number, licence type, status, expiry date, suspension dates, cancellation date and a sanctions link. The **vet registry** is much weaker. It holds only a permanent licence number, name, licence date and specialties. It has no status, no suspension flag and no ID number, so it can confirm that a licence exists but not that the vet is currently in good standing.

### Cited findings — exterminators (מדבירים מורשים)
- The official name is "מדבירים מורשים" (licensed exterminators), published by המשרד להגנת הסביבה (Ministry of Environmental Protection). Public search UI: https://www.gov.il/he/departments/dynamiccollectors/madbirim — [gov.il collector (search listing)](https://www.gov.il/he/departments/dynamiccollectors/madbirim). The page returned 403 to the fetch tool, so the UI fields could not be seen directly.
- Open data dataset: https://data.gov.il/dataset/madbirim, resource id `4941fd97-9f9f-4e45-b117-9f71735e9845`, CSV, datastore active. Last modified 2026-09-29, which suggests it is refreshed daily or close to it — [data.gov.il dataset](https://data.gov.il/dataset/madbirim); [resource](https://data.gov.il/dataset/madbirim/resource/4941fd97-9f9f-4e45-b117-9f71735e9845). Confirmed through the API endpoint `https://data.gov.il/api/3/action/package_show?id=madbirim`.
- API fields, as returned live: `LicenseNumber`, `LastName`, `FirstName`, `settlement` (city), `Telephone`, `LicenseType`, `Status`, `PermitExpirationDate` (dd/mm/yyyy), `suspension_start_date`, `suspension_end_date`, `Cancel_date`, `FinancialSanction` (an HTML link to the ministry's sanctions-publication list when a sanction exists) — [data.gov.il API datastore_search](https://data.gov.il/api/3/action/datastore_search?resource_id=4941fd97-9f9f-4e45-b117-9f71735e9845&limit=2).
- Snapshot on 2026-09-29: 2,153 records. `LicenseType` breakdown:
  - מדביר במבנים ובשטח פתוח (buildings and open areas): 1,146
  - מדביר בדירות (apartments): 624
  - מדביר באיוד (fumigation): 308
  - "…מוגבל לחרקים בלבד" (limited to insects only): 24
  - "…מוגבל למכרסמים בלבד" (limited to rodents only): 23
  - היתר מיוחד – עובד רשות מקומית (special permit, municipal worker): 14
  - מדביר צבאי (military): 12
  - היתר מיוחד – מדביר ותיק (special permit, veteran exterminator): 2

  `Status`: בתוקף (valid) 2,152, מבוטל (cancelled) 1. Four rows carry a Cancel_date. One row carries a FinancialSanction link. — [data.gov.il API](https://data.gov.il/api/3/action/datastore_search?resource_id=4941fd97-9f9f-4e45-b117-9f71735e9845)
- The earliest expiry date in the snapshot was 19/10/2026. **No expired licences were listed**, so expired licences appear to be dropped from the dataset rather than kept with an "expired" status. One record shows an expiry year of 3031, an obvious data-entry error — [data.gov.il API](https://data.gov.il/api/3/action/datastore_search?resource_id=4941fd97-9f9f-4e45-b117-9f71735e9845). (Own analysis of the full pull.)
- The statutory basis for the registry is §13 of חוק הסדרת העיסוק בהדברה תברואית, תשע"ו-2016. It requires a register of licensees, licence type, validity, cancellations and administrative sanctions, published online. Military licences are excluded from publication — [Nevo – the law](https://www.nevo.co.il/law_html/law01/501_337.htm).

### Cited findings — veterinarians (רופאים וטרינרים)
- The official name is "רופאים וטרינרים בישראל" (veterinarians in Israel), published by משרד החקלאות וביטחון המזון (Ministry of Agriculture and Food Security). Open data: https://data.gov.il/dataset/345, resource id `14339de6-278c-49ed-a6c1-307044aaee3f`, CSV, datastore active. Last modified 2026-09-29 — [data.gov.il dataset](https://data.gov.il/dataset/345); [resource](https://data.gov.il/dataset/345/resource/14339de6-278c-49ed-a6c1-307044aaee3f).
- gov.il pages linking the vet databases (licensed and specialist vets, public/municipal vets): https://www.gov.il/he/pages/veterinary-physician-databases and https://www.gov.il/he/pages/repositories-specialist-veterinarians. Per a search snippet, the latter was last updated 03.08.2026 — [gov.il](https://www.gov.il/he/pages/veterinary-physician-databases); [gov.il specialists](https://www.gov.il/he/pages/repositories-specialist-veterinarians). There is also a legacy MoAg page, https://www.moag.gov.il/vet/noseim/Monitoring_Huotrinrim_Harsotiim/Pages/default.aspx — [moag.gov.il](https://www.moag.gov.il/vet/noseim/Monitoring_Huotrinrim_Harsotiim/Pages/default.aspx). These pages could not be fetched (403), so the contents come from search snippets only.
- API fields, as returned live: `סוג_רשיון` (licence type), `מספר_רשיון` (licence number), `שם_משפחה` (surname), `שם_פרטי` (first name), `תאריך_רשיון` (licence date), and up to three `מומחיות_N` / `שנת_מומחיות_N` pairs (specialty and year) — [data.gov.il API](https://data.gov.il/api/3/action/datastore_search?resource_id=14339de6-278c-49ed-a6c1-307044aaee3f&limit=2).
- Snapshot on 2026-09-29: 3,749 records, all with `סוג_רשיון` = "מספר רישיון קבוע" (permanent licence number). 3,333 have no specialty. Of those with one: בריאות ציבור וטרינרית (veterinary public health) 125, רפואת עופות (poultry) 52, רפואה פנימית של חיות בית קטנות (small-animal internal medicine) 14, רפואת כלבים וחתולים (dogs and cats) 6 — [data.gov.il API](https://data.gov.il/api/3/action/datastore_search?resource_id=14339de6-278c-49ed-a6c1-307044aaee3f).
- The dataset has **no status, suspension, revocation, city, phone or ID-number fields** (own inspection of the fields list above). Under the Veterinarians Law, the Minister may cancel or suspend a licence (§19). A cancelled or suspended vet may therefore still appear in, or silently disappear from, the dataset, and it is unclear which — [Nevo – חוק הרופאים הווטרינרים](https://www.nevo.co.il/law_html/law00/4817.htm).

### Inferences
- The exterminator registry supports a hard, automated pre-dispatch check with `Status == בתוקף`, `PermitExpirationDate >= job date`, no active suspension window, and a licence type that covers the job scope.
- The vet registry supports "licence number exists and the name matches" only. Matching is by name plus licence number, because there is no ID number. Current good standing has to come from somewhere else, such as a self-declaration or a request to the Veterinary Services.
- Absence from the exterminator dataset should be treated as "not licensed or expired", because expired rows appear to be removed.

### Gaps
- The gov.il search UIs (madbirim, vet databases) could not be rendered (403), so I could not confirm which fields the public UI shows compared with the API.
- I found no documentation of whether revoked or suspended vets are removed from, or kept in, dataset 345.
- data.gov.il API terms and rate limits were not checked.

---

## Q2. Legal requirements per trade: legally required, customary, authority, how to verify

### Takeaway
- **Vet**: a personal licence is legally required and verifiable in a public registry. A clinic, and probably a mobile clinic, is exempt from a business licence, but a veterinary hospital is not. The exemption for mobile clinics is not confirmed by a primary source.
- **Exterminator**: a licence is legally required, has a type and a 5-year validity, is verifiable in a public registry, and must be carried on the job.
- **Mobile dog groomer**: the business-licence item exists but has applied only above 300 sqm since 29.11.2021. A van falls well below that, so no licence is needed under the Order, though this is not confirmed for mobile units specifically.
- **Dog walker and pet sitter**: no licence is required. Duties come from the national dog law and the animal-welfare law.
- **Gardener**: no occupational licence. Tree felling and heavy pruning need a forestry-officer permit, which the landowner holds. Work above 2 m needs a work-at-height certificate. Using pesticides on animal pests counts as licensed pest control.

### 2.1 Home-visit veterinarian (רופא וטרינר בביקור בית)
- **Legally required: a veterinary licence.** §4(a) of the law reads "מי שאינו רופא וטרינר לא יעסוק ברפואה וטרינרית" (anyone who is not a vet shall not practise veterinary medicine). The licence types are permanent (§3), temporary for up to one year (§16) and limited, for non-residents in teaching or research (§17). The Minister may cancel or suspend (§19). Source: חוק הרופאים הווטרינרים, התשנ"א-1991 — [Nevo](https://www.nevo.co.il/law_html/law00/4817.htm); [health.gov.il copy](https://www.health.gov.il/LegislationLibrary/Veter01.pdf).
- **Authority**: השירותים הווטרינריים (Veterinary Services), משרד החקלאות וביטחון המזון. Registry: dataset 345 above — [data.gov.il](https://data.gov.il/dataset/345).
- **Drugs**: §8 lets a veterinarian hold drugs and medicines for treatment — [Nevo](https://www.nevo.co.il/law_html/law00/4817.htm). Special veterinary preparations are dispensed at authorised dispensing places only on a vet prescription, which must include the vet's name and licence number. Source: תקנות הרוקחים (ניפוקם של תכשירים וטרינריים), התשמ"ט-1988 — [Nevo](https://nevo.co.il/law_html/law01/p211_023.htm); [health.gov.il](https://www.health.gov.il/LegislationLibrary/Rokhut12.pdf). Dangerous drugs (e.g., opioids, ketamine) fall under פקודת הסמים המסוכנים and its regulations — [Wikisource](https://he.wikisource.org/wiki/%D7%AA%D7%A7%D7%A0%D7%95%D7%AA_%D7%94%D7%A1%D7%9E%D7%99%D7%9D_%D7%94%D7%9E%D7%A1%D7%95%D7%9B%D7%A0%D7%99%D7%9D). I did not find the specific storage and record-keeping rules for a vet carrying controlled drugs in a vehicle. See Gaps.
- **Business licence for a clinic or mobile clinic**: a business-licensing consultancy reports that "מרפאה וטרינרית אינה טעונה רישיון עסק" (a veterinary clinic does not need a business licence), while a **veterinary hospital** does, under item 3.2א of צו רישוי עסקים (the Business Licensing Order) — [buslic.co.il](https://www.buslic.co.il/2019/07/17/vet-hospital/). This is contradicted by a different consultancy, which says any vet clinic with commercial activity needs a business licence — [avivbarishuy.co.il](https://avivbarishuy.co.il/%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%9F-%D7%A2%D7%A1%D7%A7-%D7%9C%D7%95%D7%95%D7%98%D7%A8%D7%99%D7%A0%D7%A8%D7%99%D7%9D/). The Order's item 3.2א wording is "בעלי חיים, לרבות ימיים למעט עופות – גידולם, אחזקתם, טיפול בהם" (animals, including marine animals but excluding poultry: their raising, keeping and treatment) — [Tel Aviv version of the Order, 2023 (PDF)](https://www.tel-aviv.gov.il/Business/BusinessLicense/DocLib/%D7%A6%D7%95%20%D7%A8%D7%99%D7%A9%D7%95%D7%99%20%D7%A2%D7%A1%D7%A7%D7%99%D7%9D%202023%20(%D7%92%D7%A8%D7%A1%D7%AA%20%D7%A2%D7%99%D7%A8%D7%99%D7%99%D7%AA%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91%20%D7%99%D7%A4%D7%95)).pdf). **Uncertain.** No primary source addresses mobile vet clinics at all.
- **Customary**: professional liability insurance and membership of the Israel Veterinary Medical Association. I found no source; see Gaps.

### 2.2 Mobile dog groomer (מספרה ניידת לכלבים)
- The Business Licensing Order has item **3.2ו "בעלי חיים – מספרה"** (animals: grooming salon). The Tel Aviv consolidated version lists, among "פריטים שבוטלו בצו רישוי עסקים מיום 29.11.21 ולא חייבים ברישיון" (items cancelled by the Order of 29.11.21, no longer requiring a licence): "בעלי חיים – מספרה ששטחה עד 300 מ"ר – בוטל" (animal grooming salon up to 300 sqm: cancelled). What remains is "בעלי חיים – מספרה ששטחה מעל 300 מ"ר" (grooming salon over 300 sqm), which needs a licence — [Tel Aviv Order 2023 PDF](https://www.tel-aviv.gov.il/Business/BusinessLicense/DocLib/%D7%A6%D7%95%20%D7%A8%D7%99%D7%A9%D7%95%D7%99%20%D7%A2%D7%A1%D7%A7%D7%99%D7%9D%202023%20(%D7%92%D7%A8%D7%A1%D7%AA%20%D7%A2%D7%99%D7%A8%D7%99%D7%99%D7%AA%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91%20%D7%99%D7%A4%D7%95)).pdf) (text extracted from the PDF). The draft amendment is on the government legislation site — [tazkirim.gov.il draft amendment 2021](https://tazkirim.gov.il/s/legislativeworkactivity/a133Y00000K4O2lQAF/%D7%94%D7%A4%D7%A6%D7%94-%D7%9C%D7%94%D7%A2%D7%A8%D7%95%D7%AA-%D7%A6%D7%99%D7%91%D7%95%D7%A8?language=en_US).
- Nevo shows the Order's latest amendment as 03-07-2025, but the schedule table was not readable there — [Nevo – צו רישוי עסקים (עסקים טעוני רישוי), תשע"ג-2013](https://www.nevo.co.il/law_html/law00/121269.htm).
- A commercial licensing site claims mobile pet grooming needs a business licence with extra mobile and hygiene conditions. This conflicts with the 300 sqm threshold above and is not supported by the primary text — [avivbarishuy.co.il](https://avivbarishuy.co.il/%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%9F-%D7%A2%D7%A1%D7%A7-%D7%9C%D7%9E%D7%A1%D7%A4%D7%A8%D7%94/).
- **Water and sewage**: I found no source on grey-water discharge rules for grooming vans. See Gaps.
- **Verification**: no registry exists. At most, the platform could collect a business-licence document or a self-declaration.

### 2.3 Dog walker and pet sitter (דוג ווקר / שמרטף לחיות)
- **No licensing regime found**, national or in the municipal bylaws I reviewed (Tel Aviv, and search results covering Lod, Rishon LeZion and Be'er Sheva) — [Nevo – Tel Aviv bylaw](https://www.nevo.co.il/law_html/law01/mek_001_011.htm); [search results incl. Lod, Rishon bylaws](https://www.lod.muni.il/he/215/).
- **Number of dogs**: I found no national or Tel Aviv rule limiting how many dogs one walker may lead. The Tel Aviv bylaw §6 lets the municipal vet refuse a *dog-ownership* licence when one person owns more than one dog. That concerns ownership, not walking — [Nevo – Tel Aviv bylaw](https://www.nevo.co.il/law_html/law01/mek_001_011.htm).
- **Duties when walking**:
  - חוק להסדרת הפיקוח על כלבים, התשס"ג-2002 (Dog Supervision Law), §11: the dog may leave the owner's property only when held by a person capable of controlling it, on a leash of a length and quality the Minister sets. There is no general muzzle duty, and local authorities designate off-leash areas — [letlive.org.il legal opinion summarising the law](https://www.letlive.org.il/?article=%D7%97%D7%95%D7%91%D7%AA-%D7%9E%D7%97%D7%A1%D7%95%D7%9D-%D7%96%D7%9E%D7%9D-%D7%9C%D7%9B%D7%9C%D7%91-%D7%97%D7%95%D7%95%D7%AA-%D7%93%D7%A2%D7%AA). This is a secondary source; I did not fetch the law text itself.
  - Tel Aviv bylaw §11: dogs in public must be "קשור היטב ברצועה או בשרשרת" (securely tied with a leash or chain) outside designated off-leash areas — [Nevo – Tel Aviv bylaw](https://www.nevo.co.il/law_html/law01/mek_001_011.htm).
- **Animal welfare**: חוק צער בעלי חיים (הגנה על בעלי חיים), התשנ"ד-1994 (Animal Welfare Law). §2(a) prohibits cruelty and abuse. §2א1 (as described by the search summary) obliges an **owner or holder (מחזיק)** to provide sustenance and care for the animal's health. The regulations for keeping animals for non-agricultural purposes (2009) require suitable food and clean water — [Nevo – the law](https://www.nevo.co.il/law_html/law01/p200m2_002.htm); [Nevo – תקנות החזקה שלא לצרכים חקלאיים, 2009](https://www.nevo.co.il/law_html/law01/500_202.htm); [gov.il](https://www.gov.il/he/pages/veter04). A pet sitter or walker is arguably a "מחזיק" (holder) while the animal is in their care. That is my inference; the exact definition was not verified.
- **Customary insurance**: third-party liability insurance for dog walkers is offered commercially in Israel — [pet-ins.net](https://pet-ins.net/pet-insurance-policies/dog-walker-insurance/). It is not legally required, and no statute was found requiring it.

### 2.4 Pest control (הדברה)
- **Legally required: an exterminator licence (רישיון מדביר)** under חוק הסדרת העיסוק בהדברה תברואית, תשע"ו-2016 (Sanitary Pest Control Law):
  - §3: no person may engage in pest control without a licence of the appropriate type.
  - §4: four licence types. Apartments ("דירות", residences or offices up to 500 sqm; per a search summary, also common property in buildings of up to 16 units). Buildings and open areas (everything except fumigation). Fumigation ("איוד", everything). Military.
  - §9: validity is **5 years**, renewable for further 5 years, with renewal filed 60 days before expiry.
  - §6: an assistant (עוזר מדביר) may work only with the licensee present, and never on fumigation.
  - §14(d)(1): the licensee must carry the licence during treatment and show it on the customer's request.
  - §14(a)–(b): before treating, the exterminator must establish that a real pest risk exists and consider prevention and alternatives.
  - §14(d)(2): the customer must be told the treatment type, risks, effectiveness and the actions needed.
  - §14(d)(8): the treatment must be documented, with a copy given to the customer.
  - §20(b): advertisements must show name, licence type and licence number.
  - §30: unlicensed practice carries up to 18 months' imprisonment.
  - §34: the administrative fine for unlicensed practice is 11,710 ₪ (individual) or 58,540 ₪ (corporation).

  Sources: [Nevo – the law](https://www.nevo.co.il/law_html/law01/501_337.htm); [gov.il legal info page](https://www.gov.il/he/departments/legalInfo/extermination_law).
- **Scope**: "מזיק" (pest) means an animal that is not a protected natural asset and is listed in the First Schedule. "הדברה" means using chemical means to destroy, inhibit, repel or reduce pests. §52 exempts treatment on human or animal bodies, agricultural pest control in crops, and animal-husbandry facilities. Private ornamental gardens are **not** exempted — [Nevo](https://www.nevo.co.il/law_html/law01/501_337.htm).
- **Special permits** under צו הסדרת העיסוק בהדברה תברואית (היתר מיוחד לביצוע פעולות הדברה), תשע"ח-2018 go only to municipal pest-control workers and veteran exterminators. They are limited to ready-to-use products (תכשיר מוכן מראש) and specific pests. Gardeners are not an eligible category — [Nevo](https://www.nevo.co.il/law_html/law01/501_899.htm). The registry carries these as "היתר מיוחד – …" (16 rows).
- **Licence application** procedure: תקנות הסדרת העיסוק בהדברה תברואית (בקשה לרישיון מדביר), תשע"ח-2018 — [Nevo](https://www.nevo.co.il/law_html/law01/501_879.htm). There is also a published draft of further duties, restrictions and conditions (2021) — [Nevo draft](https://www.nevo.co.il/law_html/law11/281021-2.htm). Whether it came into force was not verified.
- **Business licence**: item 3.3א "הדברה תברואית" (sanitary pest control) is a listed licensable business in the Business Licensing Order. Item 3.3ג, cleaning of pest-control equipment, was cancelled — [Tel Aviv Order 2023 PDF](https://www.tel-aviv.gov.il/Business/BusinessLicense/DocLib/%D7%A6%D7%95%20%D7%A8%D7%99%D7%A9%D7%95%D7%99%20%D7%A2%D7%A1%D7%A7%D7%99%D7%9D%202023%20(%D7%92%D7%A8%D7%A1%D7%AA%20%D7%A2%D7%99%D7%A8%D7%99%D7%99%D7%AA%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91%20%D7%99%D7%A4%D7%95)).pdf). **Uncertain** whether this binds a sole exterminator without premises. It may attach to the business's base or storage.
- **Pesticides in homes**: the "apartment" licence type is the one scoped to residences, and fumigation is reserved to the fumigation licence (§4). I did not find the list of pesticides approved for indoor residential use. See Gaps.

### 2.5 Gardening (גינון)
- **No occupational licence for gardeners** was found in any source reviewed. There is no gardener item in the Business Licensing Order excerpts I checked. Plant-nursery sales up to 300 sqm were also among the items cancelled in 2021 — [Tel Aviv Order 2023 PDF](https://www.tel-aviv.gov.il/Business/BusinessLicense/DocLib/%D7%A6%D7%95%20%D7%A8%D7%99%D7%A9%D7%95%D7%99%20%D7%A2%D7%A1%D7%A7%D7%99%D7%9D%202023%20(%D7%92%D7%A8%D7%A1%D7%AA%20%D7%A2%D7%99%D7%A8%D7%99%D7%99%D7%AA%20%D7%AA%D7%9C%20%D7%90%D7%91%D7%99%D7%91%20%D7%99%D7%A4%D7%95)).pdf).
- **Pesticide use by gardeners**: the 2016 law covers chemical control of *animal* pests (listed in its First Schedule) in buildings, including their adjacent private yards, and in open areas within settlements. Home gardens are not exempted. A gardener who sprays insecticide or rodenticide for a customer is therefore likely "engaging in pest control" and needs an exterminator licence. The special permit is not open to gardeners — [Nevo – law](https://www.nevo.co.il/law_html/law01/501_337.htm); [Nevo – special permit order](https://www.nevo.co.il/law_html/law01/501_899.htm). Herbicides and fungicides target plants and fungi, not listed animal pests, so they appear to fall outside this law. That is my inference and is unverified. Plant-protection products are registered and labelled by משרד החקלאות (Ministry of Agriculture) — [gov.il label guidelines](https://www.gov.il/BlobFolder/policy/moag-pro-146/he/guidelines_for_the_construction_and_approval_of_labels_for_plant_protection_pesticides.pdf).
- **Tree felling (פקודת היערות, the Forests Ordinance)**:
  - Cutting or relocating a **mature tree** (at least 2 m high with a trunk diameter of at least 10 cm at 130 cm) or a **protected-species tree** (about 70 species at any size, e.g., pine, eucalyptus, oak, cypress, olive, date palm) needs a permit from **פקיד היערות** (the forestry officer), even on private land.
  - "Cutting" includes uprooting, poisoning, removing bark, cutting roots, and **heavy pruning** that significantly harms the tree (per the 2012 amendment). Moderate pruning is allowed.
  - Penalties: about 6 months' imprisonment or fines.

  Sources: [he.wikipedia – איסור כריתת עצים בישראל](https://he.wikipedia.org/wiki/%D7%90%D7%99%D7%A1%D7%95%D7%A8_%D7%9B%D7%A8%D7%99%D7%AA%D7%AA_%D7%A2%D7%A6%D7%99%D7%9D_%D7%91%D7%99%D7%A9%D7%A8%D7%90%D7%9C) (secondary); [Nevo – פקודת היערות](https://www.nevo.co.il/law_html/law01/180_001.htm); [MoAg forestry-officer procedure (PDF)](https://www.gov.il/BlobFolder/policy/moag-pro-011/he/procedure_pkid_yeearot.pdf).

  The permit application goes through the forestry officer, the fee is about 55 ₪, and a reasoned decision is due within 21 days of a complete application. Objections can be filed within 14 days of publication (per search snippets of Kol Zchut) — [Kol Zchut – application](https://www.kolzchut.org.il/he/%D7%91%D7%A7%D7%A9%D7%AA_%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%9F_%D7%9C%D7%9B%D7%A8%D7%99%D7%AA%D7%94_%D7%90%D7%95_%D7%94%D7%A2%D7%AA%D7%A7%D7%94_%D7%A9%D7%9C_%D7%A2%D7%A5_%D7%91%D7%95%D7%92%D7%A8_%D7%90%D7%95_%D7%A2%D7%A5_%D7%9E%D7%95%D7%92%D7%9F); [Kol Zchut – appeal](https://www.kolzchut.org.il/he/%D7%A2%D7%A8%D7%A2%D7%95%D7%A8_%D7%A2%D7%9C_%D7%94%D7%97%D7%9C%D7%98%D7%94_%D7%A9%D7%9C_%D7%A4%D7%A7%D7%99%D7%93_%D7%94%D7%99%D7%A2%D7%A8%D7%95%D7%AA_%D7%9C%D7%90%D7%A9%D7%A8_%D7%9B%D7%A8%D7%99%D7%AA%D7%94_%D7%90%D7%95_%D7%94%D7%A2%D7%AA%D7%A7%D7%94_%D7%A9%D7%9C_%D7%A2%D7%A5_%D7%91%D7%95%D7%92%D7%A8_%D7%90%D7%95_%D7%A2%D7%A5_%D7%9E%D7%95%D7%92%D7%9F). The pages themselves were blocked by Cloudflare, so these details are from snippets.
- **Working at height (pruning)**: תקנות הבטיחות בעבודה (עבודה בגובה), התשס"ז-2007 (Work at Height Safety Regulations) apply to work with a risk of falling more than 2 m. Workers need training certification. Per a training provider, the certificate is valid for 2 years, and vegetation trimming is a listed use case. Trainees may work uncertified only under the continuous supervision of a qualified instructor — [Nevo – regulations](https://www.nevo.co.il/law_html/law00/74164.htm); [gov.il](https://www.gov.il/he/pages/work-safety-regulations-work-at-heights-2007); [maasa.co.il (training provider)](https://www.maasa.co.il/%D7%94%D7%93%D7%A8%D7%9B%D7%95%D7%AA/%D7%94%D7%93%D7%A8%D7%9B%D7%AA-%D7%A2%D7%91%D7%95%D7%93%D7%94-%D7%91%D7%92%D7%95%D7%91%D7%94/) (the 2-year validity and trimming use case come from this secondary source).

### Inferences
- **Unregulated as occupations**: dog walking, pet sitting and ordinary gardening. Mobile grooming is effectively unregulated for any van-sized unit since 29.11.2021, pending a primary confirmation for mobile units.
- **Regulated personal licences that can be verified in public registries**: veterinarian and exterminator.
- **Activity-level permits** that attach to a job rather than to the professional: the forestry permit for tree felling or heavy pruning, which the landowner holds, and the work-at-height certificate, which the worker holds. There is no public registry for the work-at-height certificate.

### Gaps
- Mobile vet clinic business-licence status: sources conflict and no primary source addresses it.
- Rules for carrying controlled drugs in a vet's vehicle were not found.
- Grooming-van water and sewage rules: nothing found.
- The exact definition of "בעל כלב/מחזיק" (dog owner / holder) in the 2002 Dog Supervision Law, as it applies to walkers, was not fetched.
- Whether a gardener spraying insecticide in a private garden has ever been enforced against under the 2016 law, or whether the Ministry of Environmental Protection has guidance for gardeners: not found.
- Who is criminally liable for unpermitted felling (landowner or gardener): not confirmed from a primary source.
- Customary insurance for vets, groomers and gardeners: no sources found.

---

## Q3. What a platform must check before dispatching

### Takeaway
Only pest control has a registry strong enough for an automatic, per-dispatch validity gate. That gate checks status, expiry date, suspension window and licence-type scope. Vets can be verified once, at onboarding, against the registry. The remaining trades rely on uploaded documents or self-declaration, plus job-level gating for tree work and work at height.

### Cited findings
- The exterminator dataset exposes `Status`, `PermitExpirationDate`, `suspension_start_date`/`suspension_end_date`, `Cancel_date` and `LicenseType`, and is refreshed about daily — [data.gov.il API](https://data.gov.il/api/3/action/datastore_search?resource_id=4941fd97-9f9f-4e45-b117-9f71735e9845); [dataset](https://data.gov.il/dataset/madbirim).
- Licences last 5 years (§9). The "apartments" type is limited to residences or offices up to 500 sqm (§4). Fumigation needs the fumigation type (§4). Two "limited" subtypes cover only insects or only rodents — [Nevo](https://www.nevo.co.il/law_html/law01/501_337.htm); [data.gov.il API](https://data.gov.il/api/3/action/datastore_search?resource_id=4941fd97-9f9f-4e45-b117-9f71735e9845).
- Advertising must show name, licence type and number (§20(b)). A platform listing that presents an exterminator's services arguably counts as advertising — [Nevo](https://www.nevo.co.il/law_html/law01/501_337.htm). Whether that applies to a platform is my inference.
- The vet dataset has licence number, name, date and specialty only — [data.gov.il API](https://data.gov.il/api/3/action/datastore_search?resource_id=14339de6-278c-49ed-a6c1-307044aaee3f).

### Inferences (suggested checks, not legal advice)
- **Exterminator, at onboarding and before every dispatch**:
  - licence number plus first and last name match a row
  - `Status == "בתוקף"`
  - `PermitExpirationDate` falls after the job date, with a warning 60 days ahead to match the §9 renewal window
  - no suspension window covers today
  - `Cancel_date` is empty
  - the `LicenseType` covers the job: apartment vs building or open area vs fumigation, and the insect-only or rodent-only limits
  - `FinancialSanction` is shown to an admin
  - if the professional disappears from the dataset, they become ineligible

  Show the licence type and number on the professional's profile (§20). Remind them that they must carry the licence and document the treatment for the customer (§14).
- **Vet**: at onboarding, match licence number and name against dataset 345, and record specialties. Re-check periodically for disappearance. Because the dataset has no status field, also collect a signed declaration of no suspension. Surface to Veterinary Services if needed.
- **Mobile groomer, dog walker, pet sitter**: nothing statutory to verify. Optionally collect ID, liability-insurance evidence and a self-declaration of compliance with the animal-welfare law. Per CLAUDE.md §4, any "mandatory credential" policy is a human decision and is marked TBD.
- **Gardener**:
  - Block pesticide or insecticide treatment unless the professional also holds a valid exterminator licence, checked the same way as for exterminators.
  - For "tree removal" or "heavy pruning" jobs, ask the customer whether a forestry-officer permit exists, or show a warning. No public permit-lookup API was found.
  - For work above 2 m, collect a work-at-height certificate and track its expiry manually.

### Gaps
- No public API or registry was found for forestry felling permits or work-at-height certificates.
- Whether the gov.il madbirim UI shows exactly the same data as the open dataset was not verified.
- The data.gov.il terms of use for automated or commercial use were not reviewed.

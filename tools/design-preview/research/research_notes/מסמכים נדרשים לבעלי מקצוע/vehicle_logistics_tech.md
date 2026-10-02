# Israel (as of Sept 2026): licences and verification for vehicle, logistics and tech trades — towing, roadside assistance, car lockout, courier, small moving, computer/phone repair

Research method note: primary legal texts were read from Hebrew Wikisource's consolidated law texts (they link to the official Reshumot / olaw.org.il gazette PDFs), and the data.gov.il CKAN API was queried live on 2026-09-29 to confirm which datasets and fields really exist. gov.il pages (www.gov.il/he/...) returned HTTP 403 to automated fetches, so claims that rest only on gov.il pages are marked as coming from search snippets.

Terminology trap (important for the product copy and the data model): in everyday speech, "גרר" means a tow truck. In law it is split in two. "גרור" means a trailer (e.g. `kvutzat_sug_rechev = "גרור נתמך"` in the data.gov.il heavy-vehicle dataset means a semi-trailer). A tow truck is **"רכב חילוץ"** — see the definition in reg. 1 of [תקנות התעבורה](<https://he.wikisource.org/wiki/תקנות_התעבורה>). Searching data.gov.il for "גרר" does not return tow trucks.

## Q1 — Towing (גרירה / רכב חילוץ): legally required, customary, who issues it, and how to verify

### Takeaway
Towing has three legal layers: (1) the **vehicle** must be licensed as a "רכב חילוץ"; (2) the **driver** needs the right licence class **plus a special permit (היתר) endorsed on the licence**, which for C1 needs a "קורס למפעילי רכב חילוץ וגרירה"; (3) the **business** needs a municipal business licence under item 8.2 of צו רישוי עסקים. Separately, a *mobile garage* licence explicitly covers "חילוץ רכב עד להגעתו למוסך". No open dataset flags a vehicle as a tow truck or lists tow-driver permits, so layers 1–2 need document review. Plate existence, validity and weight can be checked automatically.

### Cited Findings
- Legal definition: "רכב חילוץ" is a motor vehicle designed for recovery and towing, or controlled towing, of a vehicle that is out of action. The equipment must be permanently mounted, **and the vehicle must be marked as a recovery vehicle in its registration licence** ("שצויין ברשיונו כרכב חילוץ") — [תקנות התעבורה, reg. 1](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- Driver licence class B covers a recovery vehicle only up to 3,500 kg total weight, **and only if the holder was granted a permit under reg. 190(2)** — [תקנות התעבורה, reg. 180(א)(3)](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- Driver licence class C1 covers a recovery vehicle up to 12,000 kg **if the holder has a permit under reg. 190(3)** — [תקנות התעבורה, reg. 181(א)(3)](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- Conditions for the reg. 190(3) permit (C1 recovery vehicle): licence held for at least 2 years, Israeli resident, age 21+, not disqualified under reg. 15ב, and "סיים בהצלחה **קורס למפעילי רכב חילוץ וגרירה**… ובידו אישור על כך". The reg. 190(2) permit (class B) requires 2 years' licence, age 21, a health-ministry approval and completion of a course "לפי הענין" — [תקנות התעבורה, reg. 190](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- The permit appears on the official "add a permit" form as "היתר לנהיגת… רכב חילוץ" — [תקנות התעבורה, תוספת 13 חלק ג טופס ד](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- Recovery vehicles have their own technical and age rules. A recovery vehicle up to 16,000 kg enters the "old vehicle" regime 19 years after manufacture. Above 16,000 kg the owner must also bring a yearly approval from an authorised lab. Hydraulic-brake recovery vehicles need dual service brakes, and diesel ones need an engine brake — [תקנות התעבורה, regs. 281, 329](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- Towing a disabled vehicle with a tow bar (not a tow truck): maximum 2.5 m gap, and the connection must be clearly marked and lit — [תקנות התעבורה, reg. 90](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- **Business licence:** item **8.2** of צו רישוי עסקים (עסקים טעוני רישוי), התשע"ג-2013: "העברת רכב ממקום למקום בגרירה, הובלה או בכל דרך אחרת, וכן מקום המשמש לניהול העסק או לשליטה בו לרבות משרד". Its licensing purpose is column 2 (public safety / protection against theft, i.e. a police opinion). It is eligible for the expedited track ("ב׳") and is valid for 15 years — [צו רישוי עסקים, תוספת פרט 8.2](<https://he.wikisource.org/wiki/צו_רישוי_עסקים_(עסקים_טעוני_רישוי)>)
- **Mobile garage route:** under the 2016 vehicle-sector law, a mobile-garage licence holder may provide only (1) emergency repairs to the ignition, fuel, cooling and electrical systems, and (2) "חילוץ רכב עד להגעתו למוסך". The vehicle must display the words "מוסך נייד" and the licence number — [חוק רישוי שירותים ומקצועות בענף הרכב, התשע"ו-2016, s.135](<https://he.wikisource.org/wiki/חוק_רישוי_שירותים_ומקצועות_בענף_הרכב>); [תקנות … (מוסכים), התשפ"ב-2022, reg. 2](<https://he.wikisource.org/wiki/תקנות_רישוי_שירותים_ומקצועות_בענף_הרכב_(מוסכים)>)
- Separately, **anyone** may perform "כל פעולה הנדרשת להזזת רכב המצוי בדרך ושאינו כשיר לתנועה, למקום הקרוב ביותר שבו לא יגרום סיכון…". This allows moving a disabled car to the nearest safe spot, not transporting it to a garage — [תקנות … (פעולות ברכב המותרות שלא במוסך או במוסך נייד), התשע"ח-2018, reg. 2(1)](<https://he.wikisource.org/wiki/תקנות_רישוי_שירותים_ומקצועות_בענף_הרכב_(פעולות_ברכב_המותרות_שלא_במוסך_או_במוסך_נייד)>)
- The open garage registry on data.gov.il lists **25 rows** with the profession "מוסך נייד לחילוץ ולתיקוני חירום", including roadside-service chains (e.g. "שלמה רשת מוסכים ושרותי דרך", "קבוצת שגריר שרותי רכב") — [data.gov.il "מוסכים ומכוני רישוי" (resource bb68386a-…)](https://data.gov.il/dataset/musachim), queried via the [CKAN datastore API](https://data.gov.il/api/3/action/datastore_search?resource_id=bb68386a-a331-4bbc-b668-bba2766d517d&q=נייד) on 2026-09-29
- Plate lookup: the data.gov.il vehicle datasets are keyed by `mispar_rechev`. The private/commercial dataset exposes `tokef_dt` (licence validity), `mivchan_acharon_dt` (last annual test), `baalut` (ownership **type** only — פרטי/חברה/ליסינג/סוחר) and make/model. The >3.5 t dataset exposes `mishkal_kolel` (gross weight), `kvutzat_sug_rechev` and `grira_nm` (tow-hitch). **None of them has a "רכב חילוץ" flag** — [private-and-commercial-vehicles](https://data.gov.il/dataset/private-and-commercial-vehicles); [heavy-truck](https://data.gov.il/dataset/heavy-truck); field lists checked via [datastore_search](https://data.gov.il/api/3/action/datastore_search?resource_id=cd3acc5c-03c3-4c89-9c54-d40f93c0d790&limit=1) on 2026-09-29
- Customary requirements named by a licensing consultancy (secondary source, not law): commercial vehicle insurance, liability cover for damage to towed vehicles, a parking yard with zoning approval, and safety equipment — [avivbarishuy.co.il, updated 14 May 2025](https://avivbarishuy.co.il/%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%9F-%D7%A2%D7%A1%D7%A7-%D7%9C%D7%92%D7%A8%D7%A8/)
- A frequently cited 2023 "towing rules change" concerns **private drivers pulling trailers** (class B: tow vehicle + trailer ≤ 5,000 kg combined). It does not concern tow-truck operators — [Calcalist, 16 Oct 2023](https://www.calcalist.co.il/local_news/car/article/hyi7yu9bp); consistent with [תקנות התעבורה reg. 180(ב)](<https://he.wikisource.org/wiki/תקנות_התעבורה>)

### Inferences
- Minimum verification bundle for a towing professional:
  - (a) Photo of the vehicle registration licence showing "רכב חילוץ". Cross-check the plate on data.gov.il for existence, validity date, last test and gross weight. The weight tells you whether B (≤3.5 t), C1 (≤12 t) or C is needed.
  - (b) Photo of the driving licence showing the right class and the recovery-vehicle permit, plus the course certificate.
  - (c) The municipal business licence (item 8.2) *or* a mobile-garage licence, the latter checkable automatically in the garage dataset.
  - (d) Insurance certificates (compulsory + third-party; customary cover for towed vehicles).
- The data.gov.il checks are free and automatable with no key, via CKAN `datastore_search` with `filters={"mispar_rechev":…}`. The 4.18M-row private dataset and the 422K-row heavy dataset between them cover most plates.
- Carrier licence (רישיון מוביל) may also apply to a flatbed tow truck ≥10,000 kg that *carries* cars as cargo. See Q5 — **unconfirmed** for tow trucks.

### Gaps
- Could not read the Ministry's towing guidance on gov.il (403 to automated fetch). I found no source on whether a separate Ministry "operator licence" (רישיון מפעיל) exists for towing businesses. The primary texts reviewed (traffic regulations, 2016 vehicle-sector law, business-licensing order) contain none beyond the vehicle designation, the driver permit and the business licence. Treat "no separate operator licence" as likely but unconfirmed.
- The class-C (>12 t) route to driving a recovery vehicle is not stated explicitly in reg. 182. A legal reading is needed for heavy recovery trucks.
- Whether a tow truck ≥10 t that carries vehicles counts as "הובלת מטען" under חוק שירותי הובלה (and so needs a carrier licence) was not confirmed.
- The recovery-vehicle driver permit cannot be verified online by a third party. The driving-licence self-service is personal-area only ([gov.il personal area info](https://www.gov.il/he/pages/gov_mot), search snippet).
- Insurance for towed vehicles ("ביטוח רכוש בהעברה") is customary, not shown to be legally mandatory.

## Q2 — Roadside assistance: jump-start, flat tyre, battery (mobile tyre/battery service)

### Takeaway
The basic roadside acts — changing a wheel after a puncture, adding air, jump-starting with cables, replacing a regular 12V battery, fuses and bulbs — are **explicitly allowed for anyone** outside a garage. **Repairing** a tyre (puncture repair) and emergency repair of ignition, fuel, cooling or electrical systems are "פעולות ברכב" that require a garage or **mobile-garage (מוסך נייד)** licence from the Ministry of Transport. EV traction batteries and hybrid high-voltage batteries are excluded from the free list.

### Cited Findings
- Section 128(א) of the 2016 law: "לא ייתן אדם שירותי תיקון רכב, התקנה של מוצר תעבורה ברכב, אחזקה או בדיקה של רכב… אלא במוסך שניתן לו רישיון… או במוסך נייד שניתן לו רישיון להפעלת מוסך נייד" — [חוק רישוי שירותים ומקצועות בענף הרכב, התשע"ו-2016, s.128](<https://he.wikisource.org/wiki/חוק_רישוי_שירותים_ומקצועות_בענף_הרכב>)
- Exempted operations "שלא במוסך או במוסך נייד" include: (3) "החלפת גלגל עקב נקר או הוספת אוויר בו"; (4) fuses; (5)–(6) coolant and oil top-up; (7) bulbs; (8) "החלפת מצבר", **except** an EV battery or a hybrid high-voltage battery; (9) "התנעת רכב באמצעות כבלי התנעה" — [תקנות … (פעולות ברכב המותרות שלא במוסך או במוסך נייד), התשע"ח-2018, reg. 2](<https://he.wikisource.org/wiki/תקנות_רישוי_שירותים_ומקצועות_בענף_הרכב_(פעולות_ברכב_המותרות_שלא_במוסך_או_במוסך_נייד)>) (gazette: [ק"ת תשע"ח 2388](https://olaw.org.il/takanot/takanot-8037.pdf); amended [תשפ"ב 2182](https://olaw.org.il/takanot/takanot-10021.pdf))
- A garage's own employee may, outside the garage and within the garage's licence types, also do software updates and replace listed parts, including "מפתח, לרבות שלט רחוק" — [same regulations, reg. 3](<https://he.wikisource.org/wiki/תקנות_רישוי_שירותים_ומקצועות_בענף_הרכב_(פעולות_ברכב_המותרות_שלא_במוסך_או_במוסך_נייד)>)
- Eligibility for a mobile-garage licence: a vehicle with suitable equipment meeting the minister's requirements, and the applicant is (or employs) a garage **professional manager (מנהל מקצועי)** licensed for those operations and available during all operating hours — [2016 law, s.135(א)](<https://he.wikisource.org/wiki/חוק_רישוי_שירותים_ומקצועות_בענף_הרכב>)
- Mobile-garage licence variants: a general licence (emergency repairs + recovery to a garage), with or without tyre services, **or tyre-services only**. Tyre services under a mobile licence are limited to a factory's fleet, in the factory's closed area, between 17:00 and 07:00 — [תקנות … (מוסכים), התשפ"ב-2022, reg. 2(א)-(ב)](<https://he.wikisource.org/wiki/תקנות_רישוי_שירותים_ומקצועות_בענף_הרכב_(מוסכים)>)
- The Ministry must publish online a list of valid licence holders with licence type and number: "המנהל יפרסם באתר האינטרנט של המשרד רשימה של שמות בעלי הרישיונות התקפים, ויציין בה את סוג הרישיון ומספרו, בלבד" — [2016 law, s.6(ב)](<https://he.wikisource.org/wiki/חוק_רישוי_שירותים_ומקצועות_בענף_הרכב>)
- That list is on data.gov.il as "מוסכים ומכוני רישוי". It has 13,945 rows (one per garage × profession). Fields: `mispar_mosah` (garage licence no.), `shem_mosah`, `sug_mosah`, address, `yishuv`, `telephone`, `miktzoa`, `menahel_miktzoa` (name of the professional manager), `rasham_havarot` (company/business ID). Row counts: "תיקון והחלפת צמיגים" = 858, "חשמלאות רכב" = 625, "תיקון אחזקת רכב חשמלי/היברידי" = 860, "מוסך נייד לחילוץ ולתיקוני חירום" = 25 — [data.gov.il musachim](https://data.gov.il/dataset/musachim) (live API count, 2026-09-29)
- Business licence: a fixed garage site is item 8.9 (מוסך – מכונאות כללית / חשמלאות) — [צו רישוי עסקים, פרט 8.9](<https://he.wikisource.org/wiki/צו_רישוי_עסקים_(עסקים_טעוני_רישוי)>)
- Roadside safety: the traffic regulations allow stopping for "פעולות חילוץ נפגעים או רכב שיצא מכלל פעולה" as an exception to the stopping/parking rules — [תקנות התעבורה, reg. 69](<https://he.wikisource.org/wiki/תקנות_התעבורה>)

### Inferences
- A "jump-start / change wheel / replace 12V battery" service can legally be offered by a non-licensed individual. Verification is then just identity, driving licence, business registration (עוסק) and insurance.
- "Fix the puncture" (plug/patch), EV/hybrid battery work, or any diagnosis or repair means the professional must be a licensed garage or mobile garage. That is automatable against data.gov.il by matching `rasham_havarot` (business ID) or `mispar_mosah` plus `miktzoa`.
- Mobile tyre services for the general public look very limited under the mobile-garage rules (the tyre service is scoped to factory fleets). A public "mobile tyre repair" offering by a non-garage is legally doubtful. **Flag for legal review.**

### Gaps
- No primary source found for specific road-safety rules for someone working on a car on the shoulder (reflective vest, warning triangle for the *service provider*, motorway restrictions). The traffic regulations have general vest/triangle rules for drivers that were not extracted here.
- The dataset gives licence type but **no expiry date** ("TESTIME" is empty in samples), so validity is implied by presence on the list only.

## Q3 — Car lockout (opening a locked car)

### Takeaway
No Israeli licence specifically for car-opening or locksmiths was found. Opening a car door is not listed as a regulated "פעולה ברכב". **Key/remote replacement is garage-scope work**: it appears only in the list of things a garage employee may do outside the garage. Ownership verification must rely on documents: open vehicle data has no owner identity. Also, demanding a criminal-record certificate from a professional is a criminal offence for non-authorised parties.

### Cited Findings
- "מפתח, לרבות שלט רחוק" is listed among parts that **a garage's employee** may repair or replace outside the garage, within the garage's licence types. This implies key/remote replacement is otherwise a licensed "פעולה ברכב" — [תקנות … (פעולות ברכב המותרות שלא במוסך…), reg. 3(2)(ז)](<https://he.wikisource.org/wiki/תקנות_רישוי_שירותים_ומקצועות_בענף_הרכב_(פעולות_ברכב_המותרות_שלא_במוסך_או_במוסך_נייד)>)
- Locksmith websites claim "police approval" or a "certificate of integrity" (marketing claims, secondary, unverified) — [iopen.co.il](https://www.iopen.co.il/carunlock); [manulan-israel.co.il](https://www.manulan-israel.co.il/%D7%A4%D7%95%D7%A8%D7%A5-%D7%A8%D7%9B%D7%91%D7%99%D7%9D-%D7%9E%D7%A0%D7%A2%D7%95%D7%9C%D7%9F-%D7%A8%D7%9B%D7%91/)
- Criminal register law s.22(ב): anyone who obtains or demands register information they are not entitled to "לשם העסקה או לשם קבלת החלטה בעניין האדם" faces **2 years' imprisonment**. The subject's consent does not make it lawful: "לא יראו מי שעשה כאמור כזכאי… בשל כך בלבד שהאדם… הסכים" — [חוק המרשם הפלילי ותקנת השבים, s.22](<https://he.wikisource.org/wiki/חוק_המרשם_הפלילי_ותקנת_השבים>)
- Case law reportedly allows asking a candidate for a *declaration* on offences relevant to the role (secondary source) — [search snippet summarising Supreme Court position, workrights.co.il](https://www.workrights.co.il/%D7%AA%D7%A2%D7%95%D7%93%D7%AA-%D7%99%D7%95%D7%A9%D7%A8)
- Open vehicle data exposes only the ownership *type* (`baalut`: פרטי/חברה/ליסינג/סוחר), with no name or ID — [data.gov.il private-and-commercial-vehicles](https://data.gov.il/dataset/private-and-commercial-vehicles) (fields checked via API)

### Inferences
- Ownership verification by the professional should be procedural: see the customer's ID plus the registration licence (or digital copy from the owner's gov.il personal area), check the names match, and record plate + ID in the job log. Plate existence/model/colour can be auto-checked against data.gov.il (`tzeva_rechev`, `kinuy_mishari`) to catch obvious mismatches.
- A platform must **not** demand a police certificate (תעודת יושר) from lockout professionals unless a statute authorises it. This is legal exposure for the platform under s.22(ב). This is a §4-type decision for PRO NOW (background-check policy).

### Gaps
- No primary source found for a locksmith licensing scheme or police registration of locksmiths. No Knesset bill on the topic was found. The "police-approved locksmith" claim could not be traced to any statute or official register.

## Q4 — Courier (שליחויות) by motorcycle, scooter, e-bike or car

### Takeaway
Couriers need **no profession-specific licence**. The legal requirements are: a driving licence of the right class (A-classes for two-wheelers; A3/theory for e-bikes; B for a car or van ≤3.5 t), compulsory motor insurance ("חובה"), and ordinary business registration. General parcel "הובלה" is not a business-licence item (only valuables transport is). Commercial-use insurance is customary and affects claims. Carrier licence applies only at ≥10 t or for hazardous materials.

### Cited Findings
- Licence classes: A2 = motorcycle ≤125 cc and ≤11 kW (reg. 176). B = motor vehicle ≤3,500 kg and ≤8 passengers (reg. 180) — [תקנות התעבורה](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- Official licence-class dataset includes **A3 "אופניים חשמליים"**: minimum age 16. The licence terms read "מעבר מבחן תיאוריה או בחינה ייעודית לרכיבה" — [data.gov.il "דרגות והיתרי רישיון נהיגה"](https://data.gov.il/dataset/driving_license_ranks) (API sample, 2026-09-29)
- Business-licence order, group 8: item 8.3 "הובלה" now only covers 8.3א "כספים, יהלומים, תכשיטים, ניירות ערך ודברי ערך אחרים". Item 8.3ב is "(בוטל)" — [צו רישוי עסקים, פרט 8.3](<https://he.wikisource.org/wiki/צו_רישוי_עסקים_(עסקים_טעוני_רישוי)>)
- Insurance: a policy claim may be rejected if the damage happened during courier work under a non-courier policy (insurance-agent source, secondary) — [udidagan.co.il](https://udidagan.co.il/%D7%91%D7%99%D7%98%D7%95%D7%97-%D7%90%D7%95%D7%A4%D7%A0%D7%95%D7%A2-%D7%A2%D7%9D-%D7%AA%D7%A0%D7%90%D7%99%D7%9D-%D7%9E%D7%99%D7%95%D7%97%D7%93%D7%99%D7%9D-%D7%9C%D7%A9%D7%9C%D7%99%D7%97%D7%99%D7%9D/). The Pool (הפול) asks whether the vehicle serves the business — [pool.org.il FAQ](https://pool.org.il/%D7%A9%D7%90%D7%9C%D7%95%D7%AA-%D7%A0%D7%A4%D7%95%D7%A6%D7%95%D7%AA-%D7%97%D7%99%D7%AA%D7%95%D7%9D-%D7%95%D7%A8%D7%9B%D7%99%D7%A9%D7%94/)
- Platform liability is a live policy debate: a Tel Aviv deputy mayor drafted a bill to put vicarious safety liability for couriers' accidents on delivery platforms. It is **a proposal, not law** — [Davar](https://www.davar1.co.il/695341/)
- Plate check for two-wheelers: data.gov.il "מספרי רישוי של כלי רכב דו גלגליים" (191,737 rows). It exposes `sug_rechev_nm`, `nefach_manoa`, `sug_rechev_EU_cd` (L1/L3…), `baalut` — [data.gov.il motorcycle](https://data.gov.il/dataset/motorcycle)

### Inferences
- Courier verification = ID + driving licence photo (class matched to the declared vehicle, whose engine size/category can be auto-checked on the plate) + compulsory insurance certificate + business registration. Commercial/courier-use insurance should be a customary requirement, not presented as legal.
- The platform-liability bill is directly relevant to PRO NOW's dispatch model if it advances. Watch it.

### Gaps
- Could not confirm from a primary source whether the A3 e-bike licence/theory test is mandatory for all adult riders or only certain ages. The dataset states the terms but not the transition rules.
- Whether pedal-assist e-bikes (≤250 W) need compulsory insurance was only seen in secondary sources. Not included as fact.
- No primary source on whether e-bike courier riders in commercial use need extra permits.

## Q5 — Small moving / removals (הובלות)

### Takeaway
A **carrier licence (רישיון מוביל)** under חוק שירותי הובלה, התשנ"ז-1997 is legally required **only for commercial vehicles with gross weight ≥10,000 kg, or for hazardous materials at any weight**. It covers both paid and own-account carriage. Typical apartment and small moves use trucks under 10 t, so no carrier licence is needed. The driver needs B (≤3.5 t), C1 (≤12 t) or C. **No open dataset of licensed carriers exists** on data.gov.il. Goods-in-transit insurance is customary, not a general legal duty.

### Cited Findings
- Law definitions (per the consolidated text): "רכב מסחרי" = a commercial vehicle with permitted gross weight of 10,000 kg or more, and for hazardous materials any commercial vehicle. "שירותי הובלה" includes carriage for others and for the operator's own purposes. **s.4**: no one may provide carriage services without a carrier licence. Licences are per vehicle and cargo type. Latest amendment noted: תשפ"ה-2025 — [חוק שירותי הובלה, Wikisource](<https://he.wikisource.org/wiki/חוק_שירותי_הובלה>) (summarised via fetch)
- s.14(ג)-(ד): the bill of lading (תעודת משלוח) must state the carrier's liability for cargo and the scope of insurance against damage or loss. Blanket liability waivers are prohibited — [same](<https://he.wikisource.org/wiki/חוק_שירותי_הובלה>) (fetch summary)
- The law text reviewed contains no explicit public register of licence holders — [same](<https://he.wikisource.org/wiki/חוק_שירותי_הובלה>)
- Ministry guidance (search snippet of gov.il; page returned 403 to fetch): the licensing duty applies to commercial vehicles ≥10,000 kg, and to hazardous materials below that weight. Conditions include professional training, suitable equipment and facilities, maintenance services and **supervision by a safety officer (קצין בטיחות)** — [gov.il "רישיון מוביל"](https://www.gov.il/he/departments/guides/leading_license); [gov.il "חוק שירותי הובלה"](https://www.gov.il/he/pages/transportation_services)
- Implementing regulations: [תקנות שירותי הובלה, תשס"א-2001 (Nevo)](https://www.nevo.co.il/law_html/law01/p221k41_002.htm)
- Secondary: "רוב חברות הובלת הדירה בישראל לא חייבות ברישיון מוביל" because typical moves use 3.5–7.5 t trucks. The article describes verifying a carrier by name or licence number on a Ministry search tool, **but gives no URL** — [ovalot.co.il](https://ovalot.co.il/articles/verify-license-mot/)
- Driver classes: C1 = commercial/work vehicle >3,500 kg and ≤12,000 kg (reg. 181). C = >12,000 kg (reg. 182). C+E = with trailer or semi-trailer (reg. 183) — [תקנות התעבורה](<https://he.wikisource.org/wiki/תקנות_התעבורה>)
- Business licence: the general moving item 8.3ב is repealed ("(בוטל)"). Item 8.2 covers moving *vehicles*, not household goods — [צו רישוי עסקים](<https://he.wikisource.org/wiki/צו_רישוי_עסקים_(עסקים_טעוני_רישוי)>)
- The full list of 188 Ministry of Transport datasets on data.gov.il (queried 2026-09-29) has **no carrier-licence (מובילים) dataset**. The nearest are "כלי רכב המחויבים בהתקנת נקודות עיגון לאבטחת מטענים" and the >3.5 t vehicle list — [data.gov.il MoT organisation](https://data.gov.il/dataset/?organization=ministry_of_transport) (via `package_search fq=organization:ministry_of_transport`)

### Inferences
- For PRO NOW's "small moving" (vans / ≤7.5 t trucks): legal verification = driving licence class matched to the truck's `mishkal_kolel` (auto-checkable on data.gov.il by plate) + vehicle insurance + business registration. A carrier licence becomes mandatory only if the truck's gross weight is ≥10,000 kg, and the plate lookup can detect that automatically.
- Goods-in-transit insurance should be a customary or platform requirement. The s.14 disclosure duties formally bind only licensed carriers.

### Gaps
- Could not reach or confirm the Ministry's online carrier-licence search (gov.il blocks automated fetch; the secondary source gives no URL). Whether it is free and scrapeable is unknown.
- Amendment details of the 2025 revision to חוק שירותי הובלה were not reviewed.

## Q6 — Computer technician and mobile-phone repair

### Takeaway
**No occupational licence** exists for computer or phone repair. It is outside the vehicle and transport regimes. A fixed repair workshop *may* fall under business-licence item 10.9 (repair of devices not licensed elsewhere); a home-visit technician without premises probably needs no business licence (inference). The real legal obligations are **privacy/data-security**: Amendment 13 to חוק הגנת הפרטיות took effect 14 Aug 2025, and the 2017 Data Security Regulations treat smartphones and laptops as portable devices holding personal data.

### Cited Findings
- צו רישוי עסקים item **10.9**: "חומר גלם, מוצר, מכשיר או חלקיו שאינם טעוני רישוי לפי פרט אחר… – ייצורו, עיבודו… **תיקונו**". Purposes: 1 (environment), 3 (safety of people at the premises); validity 10 years. Item 6.5 (electronics incl. computers) covers **manufacturing** of components only — [צו רישוי עסקים, פרטים 6.5, 10.9](<https://he.wikisource.org/wiki/צו_רישוי_עסקים_(עסקים_טעוני_רישוי)>)
- Amendment 13 to the Privacy Protection Law entered into force on **14 Aug 2025**. It expanded the Privacy Protection Authority's powers (including direct administrative fines), required privacy-officer appointments in certain organisations, and cut database-registration duties for most businesses — [gov.il "תיקון 13 לחוק הגנת הפרטיות אושר בכנסת"](https://www.gov.il/he/pages/13_amendment); [law.co.il, 14 Aug 2025](https://www.law.co.il/news/2025/08/14/ppa-is-updating-its-guidelines-following-amendment-13/)
- The Data Security Regulations 2017 define a portable device to include a laptop, memory device, external drive and smartphone, noting the risk of unauthorised leakage — [תקנות הגנת הפרטיות (אבטחת מידע), תשע"ז-2017 (Nevo)](https://www.nevo.co.il/law_html/law00/144811.htm); [PPA full guide (PDF)](https://foi.gov.il/sites/default/files/%D7%94%D7%9E%D7%93%D7%A8%D7%99%D7%9A%20%D7%94%D7%9E%D7%9C%D7%90%20%D7%9C%D7%99%D7%99%D7%A9%D7%95%D7%9D%20%D7%AA%D7%A7%D7%A0%D7%95%D7%AA%20%D7%90%D7%91%D7%98%D7%97%D7%AA%20%D7%9E%D7%99%D7%93%D7%A2%20-%20PDF%20%D7%9C%D7%94%D7%93%D7%A4%D7%A1%D7%94.pdf)

### Inferences
- For a repair technician, the privacy exposure is mainly unauthorised access to or copying of customer data, which can breach the general right to privacy under the Privacy Protection Law. A platform should require a signed data-handling undertaking (no access beyond the repair, no copying, secure wipe on request, chain of custody) as a **customary/platform** requirement. It should not claim a licence exists.
- "Authorised service" (מעבדה מורשית of an importer or manufacturer) is a commercial status, not a state licence. It could be verified only against manufacturer or importer lists.
- Verification: business registration (עוסק) + ID. Optionally a manufacturer certification (e.g. vendor programmes), which is customary and not legally required.

### Gaps
- Did not find specific Privacy Protection Authority guidance on device-repair labs. Did not verify whether Amendment 13's definitions make a repair technician a "מחזיק" (holder) of the customer's database.
- Did not review the consumer-protection regulations on after-sale service and warranty (תקנות הגנת הצרכן (אחריות ושירות לאחר מכירה)). They govern importer/seller warranty service, not independent technicians.
- Did not confirm how municipalities apply item 10.9 to small phone-repair kiosks in practice.

## Q7 — Which official lookups exist (data.gov.il, Ministry of Transport)?

### Takeaway
Free, keyless, automatable CKAN APIs on data.gov.il cover **vehicles by plate** and the **Ministry-licensed garage list** (including mobile garages and tyre shops). There is **no open dataset** for carrier licences, tow-truck driver permits, individual driving licences or vehicle owners. Those need document upload plus human review.

### Cited Findings
- API pattern: `https://data.gov.il/api/3/action/datastore_search?resource_id=<id>&filters={"mispar_rechev":<plate>}`. No key needed; tested live 2026-09-29 — [data.gov.il CKAN API](https://data.gov.il/api/3/action/package_search?q=כלי%20רכב)
- Useful resources, all Ministry of Transport and refreshed 2026-09-29 per `metadata_modified`:
  - `053cea08-09bc-40ec-8f7a-156f0677aff3`: private and commercial vehicles, 4,181,719 rows. Fields: plate, make/model, `tokef_dt`, `mivchan_acharon_dt`, `baalut`, colour, VIN (`misgeret`) — [dataset](https://data.gov.il/dataset/private-and-commercial-vehicles)
  - `cd3acc5c-03c3-4c89-9c54-d40f93c0d790`: vehicles >3.5 t and vehicles without a model code, 422,199 rows. Fields: `mishkal_kolel`, `kvutzat_sug_rechev`, `tkina_EU`, `grira_nm` — [dataset](https://data.gov.il/dataset/heavy-truck)
  - `bf9df4e2-d90d-4c0a-a400-19e15af8e95f`: two-wheelers, 191,737 rows — [dataset](https://data.gov.il/dataset/motorcycle)
  - `bb68386a-a331-4bbc-b668-bba2766d517d`: garages and licensing institutes, 13,945 rows. Includes licence no., profession, professional manager, company ID. This is the published list required by s.6(ב) of the 2016 law — [dataset](https://data.gov.il/dataset/musachim)
  - `56063a99-…`: vehicle history, with `shinui_mivne_ind` (structural-change flag) — [dataset](https://data.gov.il/dataset/shinui_mivne)
  - Also available: cancelled vehicles (`reshev_bitul_sofi`), inactive vehicles, and public-transport vehicles (`kli_rechev_ciburiim`) — [MoT list](https://data.gov.il/dataset/?organization=ministry_of_transport)
- Licence-class reference table (not per person): `driving_license_ranks`, 27 rows — [dataset](https://data.gov.il/dataset/driving_license_ranks)
- Driving-licence details (validity, classes) are visible to the licence holder in the personal government area and at self-service stations (search snippet) — [gov.il gov_mot](https://www.gov.il/he/pages/gov_mot)
- Other MoT professional registries exist on data.gov.il: vehicle dealers (`socharim`), vehicle assessors (`shamaim_rechev`), driving schools (`driving_shcool`) — [MoT list](https://data.gov.il/dataset/?organization=ministry_of_transport)

### Inferences
- An automated "vehicle sanity check" (plate exists, not cancelled, licence valid, annual test date, weight → required licence class and carrier-licence threshold) plus a "garage licence check" (company ID or licence number → professions) is feasible today at zero cost. Wrap it behind a vendor-neutral provider interface, as CLAUDE.md requires.
- The open data has no owner identity, so a plate check proves the vehicle exists and its specs. It does not prove the professional owns or operates it.

### Gaps
- data.gov.il terms of use (rate limits, commercial reuse) were not reviewed in this pass — [terms](https://data.gov.il/he/terms-of-use).
- No official API found for checking another person's driving licence or permits.

## Q8 — Which of these trades are unregulated beyond business registration and a driving licence?

### Takeaway
Unregulated, meaning only general business registration, a driving licence where a vehicle is used, and compulsory motor insurance: **courier** (any vehicle <10 t, non-hazardous), **small moving** (<10 t), **computer/phone repair** (privacy law applies; business licence possibly for fixed premises), **car lockout** (door-opening only), and **basic roadside acts** (wheel change, air, jump-start, 12V battery). Regulated: **towing** (recovery-vehicle designation, driver permit plus course, business-licence item 8.2), **tyre repair and roadside mechanical repair** (garage or mobile-garage licence), and **moving with ≥10 t trucks or hazmat** (carrier licence).

### Cited Findings
- Operations anyone may do outside a garage (wheel change, air, jump-start, 12V battery, fuses, bulbs, moving a disabled car to the nearest safe place) — [2018 permitted-operations regulations, reg. 2](<https://he.wikisource.org/wiki/תקנות_רישוי_שירותים_ומקצועות_בענף_הרכב_(פעולות_ברכב_המותרות_שלא_במוסך_או_במוסך_נייד)>)
- Everything else that is "תיקון… אחזקה או בדיקה של רכב" requires a garage or mobile-garage licence — [2016 law, s.128(א)](<https://he.wikisource.org/wiki/חוק_רישוי_שירותים_ומקצועות_בענף_הרכב>)
- Carrier licence only at ≥10,000 kg or for hazmat — [חוק שירותי הובלה](<https://he.wikisource.org/wiki/חוק_שירותי_הובלה>); [gov.il snippet](https://www.gov.il/he/departments/guides/leading_license)
- Recovery-vehicle driver permit and course — [תקנות התעבורה regs. 180, 181, 190](<https://he.wikisource.org/wiki/תקנות_התעבורה>). Business licence for moving vehicles by towing — [צו רישוי עסקים 8.2](<https://he.wikisource.org/wiki/צו_רישוי_עסקים_(עסקים_טעוני_רישוי)>)

### Inferences
- For PRO NOW's per-service eligibility model:
  - `roadside.jumpstart` / `roadside.wheel_change`: identity + driving licence + insurance.
  - `roadside.tyre_repair` and `roadside.emergency_mechanical`: garage/mobile-garage licence, auto-verifiable.
  - `towing`: recovery-vehicle licence + driver permit + business licence 8.2, manual review.
  - `moving.small`: licence class by truck weight, auto-derived.
  - `moving.heavy`: carrier licence, manual review.
  - `courier`: licence class by vehicle.
  - `lockout`: identity + ownership-check procedure.
  - `tech_repair`: identity + business registration + data-handling undertaking.
- Which of these to make mandatory is a human decision (CLAUDE.md §4: "which credentials are mandatory per category", "background-check policy"). Record them as TBD, not decided.

### Gaps
- All "unregulated" conclusions rest on the primary texts reviewed (traffic regulations, 2016 vehicle-sector law and regulations, business-licensing order, carriage law). A lawyer should confirm there is no other statute (e.g. municipal bylaws for towing from private land, or police rules on locksmiths).

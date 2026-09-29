# Provider onboarding and verification: marketplace practice and baseline Israeli requirements (researched 2026-09-29)

Scope note: Sections 1 and 5 describe **international platform practice**, which is not law. Sections 2 to 4 cover **Israeli legal and administrative facts**. Section 6 covers online reputation. All sources were checked on 2026-09-29 unless a date is given. Claims taken only from search-result snippets, not from pages I opened, are marked "(snippet)".

## 1. What leading marketplaces require at provider onboarding, and how they vet

### Takeaway
There are two models:
- **Gatekeeping:** the provider cannot work until the checks pass. TaskRabbit (US), Checkatrade (UK) and Urban Company (India) work this way.
- **Badges:** the provider can join, and passing checks earns a badge on the profile. Thumbtack (in most categories), Airtasker and Angi work this way.

Across all of them the same pieces recur: an outside company for identity and background checks (Checkr, Persona, AuthBridge), a government photo ID plus a live face scan, a bank account for payouts, and, for trades, a licence and insurance. Only a few platforms verify the licence and insurance themselves. Many rely on the provider's own declaration.

### Cited Findings

**TaskRabbit (US)**
- To join you need a US Social Security Number (used for the background check), to be 18 or older, to be in an active US city, a checking account (savings accounts and prepaid cards are not accepted), a credit card, and a smartphone. There is a one-time, non-refundable $25 registration fee. — [TaskRabbit Support: What's Required to Become a Tasker](https://support.taskrabbit.com/hc/en-us/articles/204411070-What-s-Required-to-Become-a-Tasker)
- Identity checks are run by outside partners, including Persona and Checkr. If they cannot verify someone, TaskRabbit asks by email for legal name, address, date of birth and/or a photo of a government ID (snippet). — [TaskRabbit Support: Identity Verification Process](https://support.taskrabbit.com/hc/en-us/articles/115005156463-Identity-Verification-Process)
- Every US applicant goes through an identity check and a criminal background check covering national, local and sex-offender databases, and must pass both before joining (snippet). — [TaskRabbit Trust and Safety](https://support.taskrabbit.com/hc/en-us/articles/207813543-Overview-of-Trust-and-Safety); Checkr lists TaskRabbit as a customer: [Checkr: TaskRabbit](https://checkr.com/organizations/taskrabbit)
- The help page I opened gives no step order and no approval time.

**Thumbtack (US)**
- The background check is free and is not required in every category. Passing it adds a badge to the profile, and Thumbtack tells applicants when their category requires it (snippet). — [Thumbtack Help: How to take a background check](https://help.thumbtack.com/article/background-checks)
- Checkr runs the check: criminal records, the sex-offender registry and a global watchlist. It is re-run every year. An SSN is not required; a passport, driver's licence or foreign government ID is accepted. Results usually take 5–7 business days (snippet). — [Thumbtack Help](https://help.thumbtack.com/article/background-checks); [Thumbtack Safety](https://www.thumbtack.com/safety/)

**Angi (includes the former HomeAdvisor and Handy)**
- To be listed as "Angi Certified", the business owner or principal is background-checked by Checkr (national, state and county records going back at least 7 years). Employees are not checked (snippet). — [Angi FAQ](https://www.angi.com/faq/); [Checkr case study: Angi](https://checkr.com/resources/customer-stories/angi)
- Licences are **self-declared** when a business is added. Angi's Trade Licensing Department checks them from time to time, and Angi tells customers to confirm licences with the regulator themselves (snippet). — [Angi FAQ](https://www.angi.com/faq/); [Angi Trust & Safety](https://support.prepriced.angi.com/servicesdirect/s/article/Trust---Safety-General-Questions-and-Tech)

**Checkatrade (UK)**
- To get the "Checkatrade approved" tick, a trade passes up to 12 checks: photo ID, proof of address, qualifications, open-source and reputation checks, personal and business county court judgments, company history, financial checks, and a customer-experience check against other platforms. The trade also commits to "the Checkatrade Standard" (snippet). — [Checkatrade: How we check tradespeople](https://www.checkatrade.com/blog/expert-advice/checkatrade-how-we-work/); [The Checkatrade Standard (PDF)](https://cms-images.checkatrade.net/The_Checkatrade_Standard_Booklet_7bcedc3207/The_Checkatrade_Standard_Booklet_7bcedc3207.pdf)
- Members are re-checked while they are members and removed if they fall below the standard. The article on what approval requires returned 403, so I could not read the full list. — [Checkatrade: Can anyone get on Checkatrade?](https://www.checkatrade.com/blog/trade/can-anyone-get-on-checkatrade/)

**Airtasker (Australia and others)**
- The "ID verified" badge uses an outside provider that checks a government photo ID **and a live face scan** (snippet). — [Airtasker Support: What is the ID verified badge](https://support.airtasker.com/hc/en-gb/articles/21421325982873-What-is-ID-verified-badge)
- The Police Check badge is optional. It requires a national police check from the Australian Criminal Intelligence Commission (ACIC) through a verification provider with no disclosable court outcome, and it shows for at most 12 months before it must be renewed (snippet). — [Airtasker: Police Check badge](https://support.airtasker.com/hc/en-au/articles/22959979915673-What-is-the-Police-Check-Badge); [Airtasker AU police verification](https://www.airtasker.com/au/police-verification/)

**Urban Company (India)**
- Every professional's background is checked at onboarding through government-accredited third parties such as AuthBridge. Microsoft Azure face recognition confirms the professional's identity **before each job starts**, so the job is not handed to someone else. — [AuthBridge newsroom / YourStory, Mar 2020](https://yourstory.com/2020/03/urban-company-urbanclap-safety-upskilling-gig-economy)
- Only about 25–30% of applicants are accepted. Onboarding includes training of 3 to 45 days depending on category, delivered by about 150 in-house trainers. — [YourStory 2020](https://yourstory.com/2020/03/urban-company-urbanclap-safety-upskilling-gig-economy); [Urban Company blog: upskilling](https://www.urbancompany.com/blog/setting-up-service-partners-for-success-upskilling-at-urban-company). These figures date from 2020, so treat them as possibly out of date.

### Inferences
- Checking the face at the start of each job (Urban Company) is the closest precedent for an "ONLINE NOW" dispatch model. The risk it addresses, a verified account whose job is done by someone else, fits a dispatch marketplace better than a directory.
- A likely order among gatekeeping platforms is: basic account → ID plus selfie/liveness → background check → payout details → approval → can take jobs. This is an inference; TaskRabbit's page lists the requirements but not the order.
- The badge model (Thumbtack, Airtasker) cuts drop-off because providers can start before optional checks finish. That fits PRO NOW's per-service eligibility: basic identity at account level, service-specific credentials per service.

### Gaps
- I found no primary sources for Bark's or Handy's current (2026) onboarding steps, or for approval times other than Thumbtack's 5–7 days.
- I found no measured data on which UX patterns reduce drop-off (progressive onboarding, "go live after approval", document auto-scanning). Nothing sourced was found; anything on this would be opinion.

## 2. Israeli platforms and what they require from providers

### Takeaway
The best-documented Israeli directory is Midrag. It verifies reviews by phone after the job, not by checking credentials. Couriers (Wolt) must be registered as self-employed. I found little public evidence that Israeli home-service platforms verify licences or insurance.

### Cited Findings
- Globes' 2009 investigation of Israeli professional directories found light vetting. Business registration was checked through invoice books. Directories asked for 3–5 references (not family) but most did not contact them. Only a few trades (electricians, plumbers) must hold a licence, and anyone can look it up on the Ministry of Labour site. Insurance was not a standard requirement. — [Globes, 13 May 2009](https://www.globes.co.il/news/article.aspx?did=1000449165). **Out of date (2009).**
- According to that article, Midrag called 10–15 random customers from the professional's records before listing, then kept collecting reviews by **phone survey after each job** and published the call transcript. Its fee was a commission (4.5% up to ₪100,000, 2.5% above). "Easy" charged about ₪2,500–7,000 a year. — [Globes 2009](https://www.globes.co.il/news/article.aspx?did=1000449165). Current fees and methods were not verified.
- Wolt couriers in Israel are self-employed and must open an עוסק פטור (exempt dealer) or עוסק מורשה (licensed dealer) file and issue invoices. They sign up in the app or on the web, uploading an ID, address and bank account and signing an agreement (secondary source, snippet). — [Wolt Israel couriers](https://explore.wolt.com/he/isr/couriers); [perfect1 guide 2026](https://www.perfect1.co.il/miktzoa/wolt-courier). No source mentioned a criminal-record certificate (תעודת יושר) as a Wolt requirement.

### Inferences
- In Israel, "verified" has mostly meant "reviews verified by phone" (Midrag), not "credentials verified". A platform that checks per-service credentials would be ahead of local practice. This rests on a 2009 source and should be re-checked.

### Gaps
- I did not research current (2026) provider requirements for Easy, Zap, B144/Bizportal, Pitzuchim, Gett drivers or other local apps.
- I found no Israeli law or regulator rule that obliges a marketplace to verify that a professional is licensed. Licensing duties sit with the professional under trade-specific laws (for example the Electricity Law). Not confirmed with a source.

## 3. Baseline Israeli requirements for any self-employed provider

### Takeaway
Every Israeli self-employed provider must open a file with the Tax Authority (VAT and income tax) as either עוסק פטור (exempt dealer, turnover up to ₪122,833 in 2026) or עוסק מורשה (licensed dealer), and must register with ביטוח לאומי (National Insurance). A platform can check the certificate of proper bookkeeping (אישור ניהול ספרים) and the withholding-tax rate (ניכוי במקור) itself on a public Tax Authority page, using the entity number.

### Cited Findings
- An עוסק מורשה charges VAT on every sale and can deduct input VAT. An עוסק פטור charges no VAT. The 2026 exempt-dealer turnover ceiling is ₪122,833, and some professions cannot be exempt dealers at all. — [Kol-Zchut: עוסק מורשה](https://www.kolzchut.org.il/he/%D7%A2%D7%95%D7%A1%D7%A7_%D7%9E%D7%95%D7%A8%D7%A9%D7%94); [Shteinmetz Aminach CPA 2026](https://www.cpa.co.il/service/accounting-services/registered-sole-proprietor/) (snippet)
- When opening the file, the dealer declares expected annual turnover, which sets the classification. Income tax uses Form 5329. ביטוח לאומי uses Form 6101. The exempt-dealer file and the ביטוח לאומי file can be opened in one online process (snippet). — [Kol-Zchut: opening a self-employed file at ביטוח לאומי](https://www.kolzchut.org.il/he/%D7%A4%D7%AA%D7%99%D7%97%D7%AA_%D7%AA%D7%99%D7%A7_%D7%A2%D7%95%D7%A1%D7%A7_%D7%A2%D7%A6%D7%9E%D7%90%D7%99_%D7%91%D7%9E%D7%95%D7%A1%D7%93_%D7%9C%D7%91%D7%99%D7%98%D7%95%D7%97_%D7%9C%D7%90%D7%95%D7%9E%D7%99)
- The ביטוח לאומי notice must be filed within 90 days of starting work; late registration can create back-dated debt (secondary source, snippet). — [perfect1 guide](https://www.perfect1.co.il/miktzoa/wolt-courier)
- **Online check:** the Tax Authority service "אישור ניכוי במקור וניהול ספרים" (withholding and bookkeeping certificate) shows an entity's bookkeeping and withholding certificates. You choose "אישור לישות" (certificate for an entity), enter the ID, company or partnership number, and pass a captcha. — [Tax Authority: gmIshurim](https://secapp.taxes.gov.il/gmIshurim/firstPage.aspx); [gov.il service page](https://www.gov.il/he/service/itc-gmishurim)
- A bookkeeping certificate confirms the business keeps books as the law requires. A withholding certificate sets the rate the customer must deduct at source. Since 2017, new exempt dealers are generally not subject to withholding (snippet). — [Hyp blog](https://hyp.co.il/blog/withholding-tax/); [Kol-Zchut: withholding by a client](https://www.kolzchut.org.il/he/%D7%A0%D7%99%D7%9B%D7%95%D7%99_%D7%9E%D7%A1_%D7%94%D7%9B%D7%A0%D7%A1%D7%94_%D7%91%D7%9E%D7%A7%D7%95%D7%A8_%D7%A2%D7%9C-%D7%99%D7%93%D7%99_%D7%9C%D7%A7%D7%95%D7%97_%D7%A9%D7%9C_%D7%A2%D7%A1%D7%A7_%D7%A2%D7%A6%D7%9E%D7%90%D7%99)
- A related service, "מערכת 1000", gives information on withholding rates and bookkeeping status. — [gov.il: System 1000](https://www.gov.il/he/service/system1000)

### Inferences
- The public lookup has a captcha. A platform would therefore collect the certificate PDF from the provider, or have a person check it, rather than check it automatically. Automating around the captcha would break PRO NOW's own rules.
- The document that proves a file is open (the "תעודת עוסק", VAT registration certificate) is issued by the Tax Authority when the file opens. I found no public online way to check it separately from the bookkeeping-certificate lookup (see Gaps).

### Gaps
- I found no public API or captcha-free way to verify VAT or dealer status.
- I did not find the official gov.il page on how VAT registration is proven (the "תעודת עוסק מורשה/פטור" document); the claims above come from CPA and Kol-Zchut pages.
- Companies (חברה) register with the Registrar of Companies. Not researched here.

## 4. Insurance and background checks in Israel

### Takeaway
- **Insurance:** third-party liability (ביטוח צד ג') and professional liability for trades are market practice, not a general legal duty. Limits are chosen per policy (₪1M is a common example).
- **Background checks:** Israeli law **forbids** anyone not authorised in the law's schedules from asking for criminal-record information, directly or indirectly, **even with consent**. The main exception is the sex-offender employment law, which covers work with minors or vulnerable people in "institutions".

### Cited Findings — insurance
- Renovation-contractor policies usually combine cover for the works themselves, third-party liability (tenants, neighbours) and employer's liability. Professional liability for renovators was quoted at roughly ₪4,000–15,000 a year. ₪1,000,000 is given as an example of a liability limit. These come from brokers and insurers (marketing content, not norms) (snippet). — [asia-ins](https://asia-ins.co.il/renovation-contractors-insurance/); [Phoenix EXTRA builder/renovator](https://www.fnx.co.il/business-insurance/extra-safe-for-builder/); [Collective: electricians' insurance](https://www.collective.co.il/%D7%91%D7%99%D7%98%D7%95%D7%97-%D7%90%D7%97%D7%A8%D7%99%D7%95%D7%AA-%D7%9E%D7%A7%D7%A6%D7%95%D7%A2%D7%99%D7%AA-%D7%97%D7%A9%D7%9E%D7%9C%D7%90%D7%99%D7%9D/)
- Midrag publishes a business-insurance guide for professionals (not opened). — [Midrag biz: business insurance guide](https://biz.midrag.co.il/content/Article/14760)

### Cited Findings — criminal records
- חוק המרשם הפלילי ותקנת השבים, התשמ"א-1981 (the 1981 criminal register law) was replaced by **חוק המידע הפלילי ותקנת השבים, התשע"ט-2019** (the 2019 criminal information law). The new law was approved in January 2019 and took effect on **12 July 2022**. — [Hebrew Wikipedia](https://he.wikipedia.org/wiki/%D7%97%D7%95%D7%A7_%D7%94%D7%9E%D7%A8%D7%A9%D7%9D_%D7%94%D7%A4%D7%9C%D7%99%D7%9C%D7%99_%D7%95%D7%AA%D7%A7%D7%A0%D7%AA_%D7%94%D7%A9%D7%91%D7%99%D7%9D); [ynet](https://www.ynet.co.il/economy/article/syx00pgak3)
- Under the old law, an employer could not ask for criminal-record information and could not read it even if the candidate offered it. Asking the candidate to supply it was punishable by up to 2 years in prison, and **consent gave no permission**. — [WorkRights (Kol Zchut group)](https://www.workrights.co.il/%D7%AA%D7%A2%D7%95%D7%93%D7%AA-%D7%99%D7%95%D7%A9%D7%A8). This page still describes the 1981 law.
- The 2019 law forbids obtaining criminal information **directly or indirectly (by affidavit, questionnaire or declaration), even with the person's express consent** (snippet). — [ynet](https://www.ynet.co.il/economy/article/syx00pgak3); [a-law.co.il](https://a-law.co.il/%D7%97%D7%95%D7%A7-%D7%94%D7%9E%D7%99%D7%93%D7%A2-%D7%94%D7%A4%D7%9C%D7%99%D7%9C%D7%99-%D7%95%D7%AA%D7%A7%D7%A0%D7%AA-%D7%94%D7%A9%D7%91%D7%99%D7%9D/)
- Some secondary sources say an employer may ask for a **written declaration limited to offences relevant to the specific job**. This conflicts with the ynet summary that indirect requests (including declarations) are banned. **Treat this as unresolved; it needs an Israeli lawyer.** — [search snippet: workrights/what2do](https://www.criminal.what2do.co.il/P34959/)
- **Exception, the sex-offender law:** חוק למניעת העסקה של עברייני מין במוסדות מסוימים, התשס"א-2001 (updated to 2024 on Nevo). Section 2: an employer may not hire an adult convicted of a sex offence for work in an "institution", and such a person may not work there. "Work" is defined as "paid or voluntary, **including providing services**, that lets the person be in regular or ongoing contact with minors". "Institution" means places for minors and vulnerable people (schools, daycare, youth movements and similar), including a body whose activities include tutoring, instruction, teaching, entertainment or assessment for minors. Manpower contractors are covered in section 7. — [Nevo: full text](https://www.nevo.co.il/law_html/law00/72509.htm)
- The police approval must be dated within the year before hiring. As of January 2026 the duty to obtain it applies only to **adult men**, although the ban on employment applies to both sexes. — [Hilan knowledge centre](https://www.hilan.co.il/%D7%9E%D7%A8%D7%9B%D7%96-%D7%99%D7%93%D7%A2/%D7%97%D7%A7%D7%99%D7%A7%D7%94/%D7%97%D7%95%D7%A7%D7%99%D7%9D-%D7%A9%D7%95%D7%A0%D7%99%D7%9D/%D7%97%D7%95%D7%A7-%D7%9C%D7%9E%D7%A0%D7%99%D7%A2%D7%AA-%D7%94%D7%A2%D7%A1%D7%A7%D7%94-%D7%A9%D7%9C-%D7%A2%D7%91%D7%A8%D7%99%D7%99%D7%A0%D7%99-%D7%9E%D7%99%D7%9F-%D7%91%D7%9E%D7%95%D7%A1%D7%93%D7%95%D7%AA-%D7%9E%D7%A1%D7%95%D7%99%D7%9E%D7%99%D7%9D/%D7%90%D7%99%D7%A9%D7%95%D7%A8-%D7%94%D7%9E%D7%A9%D7%98%D7%A8%D7%94/)
- A parallel 2023 law covers people convicted of violence against children and vulnerable people: חוק למניעת העסקה במוסדות מסוימים של מי שהורשע באלימות כלפי ילדים וחסרי ישע, תשפ"ג-2023. — [Nevo](https://www.nevo.co.il/law_html/law00/217967.htm)

### Inferences
- If a US-style platform asked Israeli professionals to upload a תעודת יושר (criminal-record certificate) as a general condition, it would very likely break the 2019 law, even with consent. International "background check" features cannot be copied into Israel.
- The sex-offender exception is written around "institutions" and regular contact with minors. General home repair (plumbing, electrics) is probably outside it. Categories such as tutoring, babysitting or activities for children could fall inside the "service body for minors" definition. **This is a legal question for counsel (CLAUDE.md §4, background-check policy is TBD).**

### Gaps
- I did not read the 2019 law's schedules (which bodies may receive criminal information) directly on Nevo.
- I did not confirm whether a platform that matches self-employed providers counts as an "employer" or an "institution" under the 2001 law.
- I found no authoritative Israeli norm for third-party liability limits for home-service professionals, and no law requiring such insurance in general.

## 5. Identity-verification vendors (names only, no recommendation)

### Takeaway
Vendors named in the sources are AU10TIX (Israeli), Persona and Checkr (used by TaskRabbit), AuthBridge (used by Urban Company) and Microsoft Azure cognitive services (Urban Company's face check before each job).

### Cited Findings
- AU10TIX: headquartered in Tel Aviv, with R&D in Hod Hasharon. It covers IDs, face biometrics, proof of address, KYC/AML and liveness. Named clients include Google, PayPal, Uber, Fiverr, eToro and Airbnb. The Israeli digital bank ONE ZERO uses it for KYC with Bank of Israel approval. — [Wikipedia: AU10TIX](https://en.wikipedia.org/wiki/AU10TIX); [Retail Banker International](https://www.retailbankerinternational.com/news/one-zero-taps-au10tix/)
- Persona and Checkr (TaskRabbit ID checks). — [TaskRabbit Support](https://support.taskrabbit.com/hc/en-us/articles/115005156463-Identity-Verification-Process)
- AuthBridge and Microsoft Azure (Urban Company). — [YourStory 2020](https://yourstory.com/2020/03/urban-company-urbanclap-safety-upskilling-gig-economy)

### Gaps
- Onfido was not checked in this pass.
- I did not check vendor support for Israeli ID cards (the biometric card and its paper supplement, ספח).

## 6. How platforms verify online reputation (Google, Facebook, Midrag, Easy)

### Takeaway
Google's Places API lets a platform **show** a business's reviews live, with strict attribution rules. It forbids **storing** them, except the place ID. So the only compliant way to "import" Google reputation is to store the provider's place ID and fetch the reviews live.

### Cited Findings
- "You must not pre-fetch, cache, or store Places API content beyond the allowed exceptions." The **place ID** is exempt and may be stored indefinitely. — [Google Places API (New) policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- Reviews must credit the author (avatar, name, profile link; if space is limited, at least the avatar). A platform must also show "a clear notice that describes how reviews are being ordered and filtered". — [Google Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- The Google Maps logo is required when data is shown without a Google map, at a minimum height of 16dp, and must never be hidden or changed. — [Google Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies); [Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms)
- Keeping a Place Name beyond the user session counts as scraping and is not allowed (secondary summary). — [bizcollect.dev](https://bizcollect.dev/blog/google-places-api-terms)
- Checkatrade's vetting includes a "customer experience check against other platforms", meaning reputation elsewhere is used as a vetting input, not re-published (snippet). — [Checkatrade: How we check](https://www.checkatrade.com/blog/expert-advice/checkatrade-how-we-work/)
- Midrag collects reviews by phone after verified jobs (as of 2009). — [Globes 2009](https://www.globes.co.il/news/article.aspx?did=1000449165)

### Inferences
- To avoid showing someone else's business, PRO NOW would need to confirm that the provider owns the Google listing (for example by matching the listing's phone number with a one-time code). Google offers no public "prove ownership" API to third parties, so this is unconfirmed.
- Reviews imported from outside cannot be shown as PRO NOW reviews, and cannot be blended into a PRO NOW score without clear labelling. That follows from the "never fabricate a trust score" invariant and Google's rule to disclose ordering and filtering.

### Gaps
- I did not research Facebook/Meta page-review API access, Midrag's or Easy's terms on reusing their reviews, Israeli consumer-protection rules on fake reviews, or measured fake-review rates.

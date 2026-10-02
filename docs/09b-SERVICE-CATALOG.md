# 09b — Service Catalog & Pilot Matrix (development seed reference)

Source: "PRO NOW — Service Catalog & Pilot Matrix v1.0" Google Sheet,
tab `Services Master`, transcribed in full. This is a **human-readable seed
reference**, not a production runtime dependency — `apps/api/prisma/seed.ts`
converts the `PILOT_CANDIDATE` rows into versioned database seed data.
`VALIDATE` rows are modeled in the taxonomy but stay inactive
(`MarketActivation.customer_visible = false`) until a human approves them.

Columns: Service ID · Department · Category · Service (Hebrew) · Price
Model · Typical Duration · NOW Fit · Pilot · Trust Tier · Credential Rule ·
Equipment · Customer Inputs · Provider Payout Basis · Launch Status · Notes

| Service ID | Department | Category | Service (HE) | Price Model | Duration | NOW Fit | Pilot | Trust | Launch Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| BEAUTY_NAIL_GEL | יופי וטיפוח | ציפורניים | מניקור ג'ל עד הבית | FIXED | 60–90 min | High | YES | B | PILOT_CANDIDATE | Strong fixed-menu NOW example |
| BEAUTY_NAIL_MANICURE | יופי וטיפוח | ציפורניים | מניקור קלאסי | FIXED | 45–60 min | High | YES | B | PILOT_CANDIDATE | |
| BEAUTY_NAIL_PEDICURE | יופי וטיפוח | ציפורניים | פדיקור קוסמטי | FIXED | 60–90 min | Medium | LATER | B | VALIDATE | Keep medical/therapeutic claims out unless approved |
| BEAUTY_HAIR_MEN | יופי וטיפוח | שיער | תספורת גבר עד הבית | FIXED | 30–45 min | High | YES | B | PILOT_CANDIDATE | |
| BEAUTY_HAIR_BLOWDRY | יופי וטיפוח | שיער | פן/עיצוב שיער עד הבית | FIXED | 45–75 min | High | YES | B | PILOT_CANDIDATE | |
| BEAUTY_MAKEUP | יופי וטיפוח | איפור | איפור עד הבית | FIXED | 60–90 min | Medium | LATER | B | VALIDATE | Event/bridal may not fit NOW |
| WELLNESS_MASSAGE60 | Wellness | מסאז' | מסאז' 60 דק' עד הבית | FIXED | 60 min+setup | High | YES | C | PILOT_CANDIDATE | Avoid medical claims unless licensed scope |
| WELLNESS_MASSAGE90 | Wellness | מסאז' | מסאז' 90 דק' עד הבית | FIXED | 90 min+setup | High | YES | C | PILOT_CANDIDATE | |
| HOME_PLUMB_BLOCK | בית ותיקונים | אינסטלציה | סתימה/בעיה באינסטלציה | VISIT_QUOTE | variable | High | YES | C | PILOT_CANDIDATE | Visit fee explicit |
| HOME_PLUMB_LEAK | בית ותיקונים | אינסטלציה | נזילה/פיצוץ בצנרת | VISIT_QUOTE | variable | High | YES | C | PILOT_CANDIDATE | Emergency routing boundaries required |
| HOME_ELECT_FAULT | בית ותיקונים | חשמל | תקלה חשמלית בבית | VISIT_QUOTE | variable | High | YES | C | PILOT_CANDIDATE | Dispatch only credential-eligible pro |
| HOME_ELECT_INSTALL | בית ותיקונים | חשמל | התקנת גוף תאורה/אביזר חשמל | VISIT_QUOTE | 45–120 min | High | YES | C | PILOT_CANDIDATE | Exact pricing config can evolve |
| HOME_HANDYMAN | בית ותיקונים | הנדימן | הנדימן למשימה קטנה | HOURLY | 60–180 min | High | YES | B | PILOT_CANDIDATE | Dynamic form must screen regulated tasks |
| CLEAN_BASIC | ניקיון ומשק בית | ניקיון | ניקיון בית לפי שעה | HOURLY | 2–5 hrs | Medium | YES | B | PILOT_CANDIDATE | Minimum duration |
| CLEAN_URGENT | ניקיון ומשק בית | ניקיון | מנקה פנוי/ה להיום עכשיו | HOURLY | 2–4 hrs | High | YES | B | PILOT_CANDIDATE | Strong liquidity challenge |
| COURIER_DOC | שליחויות וסידורים | שליח | מסמך/חבילה קטנה מנקודה לנקודה | DISTANCE_TIME | route based | High | YES | B | PILOT_CANDIDATE | Prohibited item policy |
| COURIER_STORE | שליחויות וסידורים | שליח | איסוף מחנות ומסירה | DISTANCE_TIME | route based | High | YES | B | PILOT_CANDIDATE | Payment-for-goods flow not MVP unless explicitly designed |
| PET_WALK30 | חיות | דוגווקר | טיול כלב 30 דקות | FIXED | 30 min | High | LATER | B | VALIDATE | Pet handoff/safety flow needed |
| PET_WALK60 | חיות | דוגווקר | טיול כלב 60 דקות | FIXED | 60 min | High | LATER | B | VALIDATE | |
| AUTO_BATTERY | רכב | שירות רכב נייד | סיוע/החלפת מצבר במקום | VISIT_QUOTE | 30–60 min | High | LATER | C | VALIDATE | Parts inventory complexity |
| AUTO_TIRE | רכב | שירות רכב נייד | סיוע בפנצ'ר/גלגל | VISIT_QUOTE | 30–60 min | High | LATER | C | VALIDATE | |
| TECH_HOME | טכנולוגיה | תמיכה טכנית | טכנאי מחשבים/רשת/Wi-Fi עד הבית | VISIT_QUOTE | 60–120 min | High | LATER | B | VALIDATE | No credential/password harvesting |
| MOVING_SMALL | מעבר והרכבה | הובלה קטנה | פריט בודד/הובלה קטנה | DISTANCE_TIME | variable | Medium | LATER | C | VALIDATE | Capacity/vehicle matching |
| BEAUTY_LASH | יופי וטיפוח | ריסים | טיפול ריסים עד הבית | FIXED | 60–120 min | Medium | LATER | C | VALIDATE | |
| FIT_PERSONAL | Wellness | כושר | אימון אישי בבית/בפארק | FIXED | 45–60 min | Medium | LATER | B/C | VALIDATE | |

## Why this pilot set (Final Pre-Development Decisions §4)
It forces the product to prove all four pricing engines and different
operational realities while retaining the same NOW dispatch loop: beauty
proves the portable fixed menu; massage proves enhanced trust/home-entry;
plumbing/electrical prove diagnosis+quote/credentials; cleaning/handyman
prove hourly; courier proves pickup/dropoff/distance.

## Rule
`Claude converts approved seed rows into version-controlled database seed
data. The spreadsheet is not queried by production apps.` — enforced by
`apps/api/prisma/seed.ts` reading a checked-in TypeScript array
(`apps/api/prisma/seed-data/services.ts`), not this markdown file, at
runtime.

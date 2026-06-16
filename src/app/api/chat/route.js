import Anthropic from '@anthropic-ai/sdk';
import { cookies } from 'next/headers';
import { TOOL_HANDLERS } from '@/lib/tools';
import { getSessionUser, getUserMemory, saveUserMemory, getUserConversations } from '@/lib/db';

const client = new Anthropic();

const SYSTEM_PROMPT = `אתה מתכנן פיננסי מוסמך (CFP) דיגיטלי מקצועי ואמפתי. שמך "נועם". אתה מדבר עברית טבעית וידידותית.
אתה מבין את כל תחומי הפיננסים האישיים: השקעות, ביטוח, פנסיה, משכנתא, מיסוי, חיסכון, תכנון פרישה, וניהול תקציב.

═══════════════════════════════════════
## המטרה שלך
לנהל שיחה חכמה עם הלקוח, להבין את התמונה הפיננסית המלאה שלו, ולתת לו תכנית פיננסית מקיפה ומותאמת אישית.

═══════════════════════════════════════
## תחומי המומחיות שלך

### 1. 📊 השקעות ושוק ההון
- בניית תיק השקעות (מניות, אג"ח, מדדים, ETFs)
- הקצאת נכסים לפי פרופיל סיכון
- ניתוח פונדמנטלי ומכפילים
- מעקב שוק בזמן אמת (השתמש בכלים!)

### 2. 🏦 פנסיה וחיסכון ארוך טווח
**קרנות פנסיה בישראל:**
- פנסיה מקיפה (חובה על כל עובד) — עובד 6%, מעסיק 6.5% שכר, + 6% פיצויים
- דמי ניהול: מצבירה (עד 0.5% ממוצע) + מהפקדה (עד 1.5%)
- **טיפ חשוב:** הפחתת דמי ניהול ב-0.25% יכולה לחסוך מאות אלפי ₪ לאורך 30 שנה
- קרנות מומלצות: הראל, מגדל, מנורה, כלל, פניקס, אלטשולר שחם, מור
- גיל פרישה: 67 לגברים, 65 לנשים (עולה ל-65 בהדרגה)

**קופות גמל:**
- גמל להשקעה — חיסכון פטור ממס רווח הון (אחרי גיל 60)
- גמל לחיסכון — תקרת הפקדה שנתית ₪79,006 (2024)
- גמל להשכרה — חיסכון לדירה להשכרה עם הטבות מס

**קרן השתלמות:**
- עובד 2.5% + מעסיק 7.5% = 10% מהשכר
- פטורה ממס עד תקרה של ₪15,712/חודש (2024)
- נזילה אחרי 6 שנים (3 לפדיון לדירה)
- **מס ההשתלמות הכי משתלמת** — אחת ההטבות הטובות ביותר בישראל
- עצמאים: עד 4.5% מהכנסה חייבת + 1/3 שליש הטבת מס

**ביטוח מנהלים:**
- דומה לפנסיה אבל עם מרכיב ביטוח חיים וא.כ.ע
- דמי ניהול גבוהים יותר מפנסיה
- יתרון: גמישות בהגדרת כיסויים

### 3. 🛡️ ביטוחים
**ביטוח חיים:**
- ריסק (term life) — ביטוח טהור, זול, מומלץ למשפחות צעירות
- כלל אצבע: כיסוי של 10-12 שנות הכנסה
- עלות ממוצעת: ₪80-200/חודש לכיסוי של ₪1-2M

**ביטוח אובדן כושר עבודה (א.כ.ע):**
- מכסה עד 75% מהשכר במקרה של אובדן יכולת לעבוד
- **חיוני** — בלי זה אין רשת ביטחון
- בדוק הגדרה: "עיסוקי" (מומלץ) vs "כל עיסוק" (פחות טוב)
- תקופת המתנה: 30/60/90 יום — ככל שארוכה יותר, הפרמיה זולה יותר

**ביטוח בריאות:**
- סל בריאות ממלכתי (חינם) + שב"ן (שירותי בריאות נוספים) בקופ"ח
- ביטוח בריאות פרטי — כיסוי ניתוחים, רפואה בחו"ל, תרופות
- ביטוח שיניים — שווה לשקול
- ביטוח סיעודי — חשוב מגיל 50+

**ביטוח רכב:**
- חובה (חוק)
- מקיף — כיסוי מלא, מומלץ לרכב חדש
- צד ג׳ — חוסך פרמיה, מתאים לרכב ישן

**ביטוח דירה:**
- מבנה (חובה במשכנתא) — כיסוי נזקי רעידת אדמה, שריפה, הצפה
- תכולה — ריהוט, מכשירי חשמל, גניבה
- צד ג׳ — נזק לשכנים/אורחים

### 4. 🏠 משכנתא
**סוגי מסלולים:**
- **פריים** (משתנה) — פריים - X%. כיום פריים = 5.75%. הכי נזיל, אפשר לפרוע מוקדם
- **קבועה לא צמודה (קל"צ)** — ריבית קבועה ל-5-30 שנה, ודאות מלאה
- **צמודה למדד (צמוד)** — ריבית נמוכה יותר אבל הקרן עולה עם המדד
- **משתנה כל 5 שנים** — ריבית מתעדכנת כל 5 שנים

**כללי אצבע:**
- לא יותר מ-30% מההכנסה נטו על החזר משכנתא
- פיזור: 1/3 פריים, 1/3 קל"צ, 1/3 צמוד (ניתן להתאים)
- LTV מקסימלי: 75% לדירה ראשונה, 50% לדירה שנייה
- **מיחזור משכנתא** — אם הריבית ירדה, שווה לבדוק (עלות: ₪5-15K)
- עלויות נלוות: שמאות (₪2-3K), עו"ד (0.5-1%), מס רכישה

**מס רכישה (2024):**
- דירה יחידה: 0% עד ₪1.98M, 3.5% עד ₪2.35M, 5% עד ₪6.06M, 8%/10% מעל
- דירה שנייה: 8% מהשקל הראשון עד ₪6.06M, 10% מעל

### 5. 💰 מיסוי
**מס הכנסה — מדרגות 2024:**
- עד ₪84,120: 10%
- ₪84,121-₪120,720: 14%
- ₪120,721-₪193,800: 20%
- ₪193,801-₪269,280: 31%
- ₪269,281-₪560,280: 35%
- ₪560,281-₪721,560: 47%
- מעל ₪721,560: 50% (מס יסף)

**מס רווח הון:**
- 25% על רווח ממניות/אג"ח/קרנות
- פטור: קרן השתלמות, גמל אחרי 60
- ניכוי הפסדים: אפשר לקזז הפסדים כנגד רווחים

**הטבות מס חשובות:**
- סעיף 47: הפקדה לקרן פנסיה — זיכוי 35% עד תקרה
- סעיף 45א: הפקדה לביטוח חיים — זיכוי 25%
- נקודות זיכוי: 2.75 לגבר, 2.75+ לאישה, נקודה לכל ילד
- תרומות מוכרות: זיכוי 35% על תרומות ₪195-₪9.7M
- עצמאים: ניכוי הפקדות לקרן פנסיה + השתלמות

**מס שבח (מכירת נדל"ן):**
- 25% על השבח (רווח)
- פטור דירה יחידה: פעם ב-18 חודשים
- חישוב ליניארי מוטב: פטור על שבח עד 2014

### 6. 📋 תכנון פרישה
- **כלל 4%:** תיק פרישה צריך להיות 25x ההוצאות השנתיות
- **למשל:** הוצאה חודשית ₪15K = שנתית ₪180K = תיק של ₪4.5M
- **מקורות הכנסה בפרישה:** פנסיה + ביטוח לאומי + חיסכון אישי + שכירות
- **ביטוח לאומי — קצבת זקנה:** ₪1,738/חודש (יחיד), ₪2,607 (זוג), +5% לכל שנת דחייה
- **תכנון מס בפרישה:** פריסת מענק פרישה, פטור קצבה מזכה

### 7. 💼 תכנון לעצמאים
- חובת הפקדה לפנסיה: 4.45% מהכנסה עד תקרה
- קרן השתלמות: 4.5% ניכוי + 1.5% הטבה
- ביטוח לאומי: 5.97% עד ₪7,522/חודש, 14.76% מעל
- מקדמות מס / דו"ח שנתי
- ניכוי הוצאות עסקיות

═══════════════════════════════════════
## שלב 1: הכרות מקיפה (שאל 1-2 שאלות בכל הודעה!)

בתחילת השיחה, הכר את הלקוח. **שיחה טבעית — לא שאלון!**

שאל בהדרגה על:
א. **מצב משפחתי** — גיל, רווק/נשוי/ילדים, מפרנס יחיד?
ב. **הכנסה** — שכיר/עצמאי? הכנסה חודשית ברוטו/נטו?
ג. **הוצאות** — כמה נשאר בסוף החודש? יש משכנתא? שכירות?
ד. **חסכונות קיימים** — כמה חסוך? איפה? (עו"ש, פק"מ, קרנות, מניות)
ה. **פנסיה והשתלמות** — יש? כמה מופקד? יודע כמה דמי ניהול?
ו. **ביטוחים** — יש ביטוח חיים? א.כ.ע? בריאות פרטי?
ז. **נדל"ן** — יש דירה? משכנתא? שוכר? חולם לקנות?
ח. **יעדים** — מה המטרה? קנייה/חיסכון/פרישה/חינוך ילדים/רילוקיישן?
ט. **יחס לסיכון** — שאל חכם: "אם ההשקעה שלך יורדת 20%, מה אתה עושה?"

═══════════════════════════════════════
## שלב 2: תמונה פיננסית

אחרי שאספת מספיק מידע, הצג ללקוח סיכום:
- **פרופיל:** גיל, מצב משפחתי, הכנסה, הוצאות
- **מצב נוכחי:** חסכונות, פנסיה, ביטוחים, נדל"ן
- **פערים:** מה חסר? (ביטוח? חיסכון? תכנון מס?)
- **יעדים:** מה הלקוח רוצה להשיג
- **רמת סיכון:** שמרני / מאוזן / אגרסיבי

שאל אם הוא מסכים לפני שממשיכים.

═══════════════════════════════════════
## שלב 3: תכנית פיננסית מקיפה

על בסיס הפרופיל, בנה תכנית מלאה. ענה על **כל** התחומים הרלוונטיים:

### 🛡️ ביטוחים — בדוק ומלא פערים
- חסר ביטוח חיים? → המלץ על ריסק עם סכום מתאים
- חסר א.כ.ע? → זה **חיוני**, תדגיש
- בריאות פרטי — שווה? תלוי במצב

### 🏦 פנסיה — אופטימיזציה
- בדוק דמי ניהול — אם מעל 0.3% מצבירה → המלץ למחזר
- בדוק מסלול השקעה — מתאים לגיל?
- קרן השתלמות — ממקסם? אם לא, כסף על הרצפה

### 🏠 משכנתא — אם רלוונטי
- בדוק תמהיל מסלולים
- שווה למחזר?
- כמה מהכנסה הולך על משכנתא?

### 💰 מיסוי — הטבות לא מנוצלות
- הפקדות מוטבות לפנסיה/גמל
- ניצול נקודות זיכוי
- קיזוז הפסדים
- תרומות מוכרות

### 📊 השקעות — תיק מותאם
- הקצאת נכסים לפי פרופיל סיכון ואופק
- **השתמש בכלים** לנתוני שוק אמיתיים
- מניות, אג"ח, מדדים, ETFs — עם סכומים ונימוקים

### 📋 תכנון פרישה — אם רלוונטי
- כמה צריך לחסוך עד גיל הפרישה?
- האם הקצב הנוכחי מספיק?
- מה צריך לשנות?

═══════════════════════════════════════
## כללים חשובים

1. **שיחה טבעית** — 1-2 שאלות בכל פעם, לא שאלון ארוך
2. **תמיד השתמש בכלים** לנתוני השקעות — אל תמציא מספרים
3. **הסבר פשוט** — הלקוח לא בהכרח מבין. תסביר מושגים בגובה העיניים
4. **עברית** — כל הפלט בעברית. מונחים מקצועיים עם הסבר
5. **אמפתיה** — כסף זה רגיש. תהיה רגיש למצב הלקוח
6. **תעדוף** — אל תציף. תן 2-3 המלצות הכי דחופות קודם, ואז הרחב
7. **disclaimer** — הזכר שזה אינו ייעוץ פיננסי רשמי ומומלץ להתייעץ עם יועץ מורשה
8. **מספרים** — תמיד תן מספרים קונקרטיים (₪X/חודש, X%, ₪X סה"כ)
9. **סדר עדיפויות:** ביטוח (רשת ביטחון) → פנסיה → חירום (3-6 חודשים) → חובות → השקעות
10. **אל תמליץ על מוצר ספציפי** של חברת ביטוח — תן קווים מנחים ותגיד להשוות הצעות
11. **🔴 תמונת נכסים — כללים קריטיים!** השתמש בכלי update_portfolio **רק ואך ורק** כשהלקוח מציין במפורש שיש לו נכס עם סכום. **אסור בשום אופן** להוסיף נכסים שהלקוח לא הזכיר. **אסור** להניח שיש לו משהו. **אסור** להוסיף נכסים על בסיס המלצות שלך.
    - ✅ "יש לי 50K בבנק" → update_portfolio עם bank
    - ✅ "הפנסיה שלי במגדל, 400K" → update_portfolio עם pension
    - ✅ "משכנתא של 800K" → update_portfolio עם loan
    - ❌ "אתה צריך קרן השתלמות" → אל תוסיף! זו המלצה, לא נכס קיים
    - ❌ "כדאי לפתוח תיק מניות" → אל תוסיף! הלקוח לא אמר שיש לו
    - ❌ להוסיף כל דבר שהלקוח לא אמר שיש לו במפורש

═══════════════════════════════════════
## ETFs ומדדים שימושיים

**מדדים רחבים:** SPY (S&P500), QQQ (Nasdaq100), VTI (Total US), VXUS (International), VWO (Emerging)
**אג"ח:** BND (Total Bond), AGG (Aggregate Bond), TLT (Long Treasury), IEF (7-10Y Treasury), SHY (Short Treasury), LQD (Corporate IG), HYG (High Yield)
**סקטוריאליים:** XLK (Tech), XLV (Health), XLF (Finance), XLE (Energy), XLRE (Real Estate)
**סגנון:** VUG (Growth), VTV (Value), VYM (High Dividend), SCHD (Dividend Growth)
**ישראל:** TA35.TA, TA125.TA`;

const TOOLS = [
  {
    name: 'get_fundamentals',
    description: 'מחזיר נתונים פונדמנטליים של חברה: מכפילים, רווחיות, צמיחה, בריאות פיננסית, המלצות אנליסטים. השתמש לפני כל המלצה על מניה.',
    input_schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'סמל המניה (למשל AAPL, NVDA, TEVA.TA)' },
      },
      required: ['symbol'],
    },
  },
  {
    name: 'get_market_overview',
    description: 'סקירת שוק כללית — מדדים ראשיים, סקטורים, ואג"ח. שימושי להבנת מצב השוק לפני בניית תיק.',
    input_schema: {
      type: 'object',
      properties: {
        markets: { type: 'array', items: { type: 'string', enum: ['us', 'ta'] }, description: 'שווקים (ברירת מחדל: us)' },
      },
    },
  },
  {
    name: 'get_sector_stocks',
    description: 'מחזיר רשימת מניות מובילות בסקטור מסוים עם נתוני מחיר ומכפילים. סקטורים: technology, healthcare, finance, energy, consumer, realestate, industrial.',
    input_schema: {
      type: 'object',
      properties: {
        sector: {
          type: 'string',
          enum: ['technology', 'healthcare', 'finance', 'energy', 'consumer', 'realestate', 'industrial'],
          description: 'שם הסקטור',
        },
      },
      required: ['sector'],
    },
  },
  {
    name: 'get_etf_data',
    description: 'מחזיר נתונים על קרנות סל (ETFs) ומדדים. שימושי לבדיקת מדדים, אג"ח ETFs, או סקטוריאליים.',
    input_schema: {
      type: 'object',
      properties: {
        symbols: {
          type: 'array',
          items: { type: 'string' },
          description: 'רשימת סמלי ETFs (למשל ["SPY", "QQQ", "BND"])',
        },
      },
      required: ['symbols'],
    },
  },
  {
    name: 'calculate_financial_plan',
    description: 'מחשב תכנית פיננסית: חיסכון נדרש לפרישה, עלות משכנתא, החזר חודשי, השפעת דמי ניהול, והשוואת מסלולי חיסכון.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['retirement', 'mortgage', 'savings', 'pension_fees', 'tax_benefit'],
          description: 'סוג החישוב',
        },
        params: {
          type: 'object',
          description: 'פרמטרים לחישוב — משתנים לפי סוג',
          properties: {
            age: { type: 'number', description: 'גיל נוכחי' },
            retirement_age: { type: 'number', description: 'גיל פרישה' },
            monthly_income: { type: 'number', description: 'הכנסה חודשית ברוטו ב-₪' },
            monthly_expenses: { type: 'number', description: 'הוצאות חודשיות ב-₪' },
            current_savings: { type: 'number', description: 'חיסכון נוכחי ב-₪' },
            monthly_saving: { type: 'number', description: 'חיסכון חודשי ב-₪' },
            expected_return: { type: 'number', description: 'תשואה שנתית צפויה (אחוז)' },
            mortgage_amount: { type: 'number', description: 'סכום משכנתא ב-₪' },
            mortgage_rate: { type: 'number', description: 'ריבית שנתית (אחוז)' },
            mortgage_years: { type: 'number', description: 'תקופת משכנתא בשנים' },
            pension_balance: { type: 'number', description: 'יתרת פנסיה נוכחית ב-₪' },
            management_fee_percent: { type: 'number', description: 'דמי ניהול מצבירה (אחוז)' },
            annual_income: { type: 'number', description: 'הכנסה שנתית ברוטו ב-₪' },
          },
        },
      },
      required: ['type', 'params'],
    },
  },
  {
    name: 'update_portfolio',
    description: `עדכן את תמונת הנכסים של הלקוח. השתמש בכלי הזה **רק** כשהלקוח אומר במפורש שיש לו נכס קיים עם סכום.
קטגוריות: bank (חשבון בנק), stocks (תיק מניות), pension (פנסיה), gemel (קופת גמל), hishtalmut (קרן השתלמות), savings (חיסכון/פיקדון), realestate (נדל"ן), crypto (קריפטו), insurance (ביטוח מנהלים), cash (מזומן), loan (הלוואה/משכנתא), other (אחר).
פעולות: add (הוספה), update (עדכון), remove (מחיקה).
**אסור** להוסיף נכסים שהלקוח לא הזכיר שיש לו. **אסור** להוסיף על בסיס המלצות שלך. רק מה שהלקוח אמר שקיים אצלו.`,
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'update', 'remove'], description: 'פעולה' },
        items: {
          type: 'array',
          description: 'רשימת נכסים לעדכון',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: ['bank', 'stocks', 'pension', 'gemel', 'hishtalmut', 'savings', 'realestate', 'crypto', 'insurance', 'cash', 'loan', 'other'], description: 'קטגוריה' },
              name: { type: 'string', description: 'שם הנכס (למשל: לאומי, מגדל פנסיה, דירה ברמת גן)' },
              value: { type: 'number', description: 'שווי ב-₪' },
              detail: { type: 'string', description: 'פירוט נוסף (למשל: דמי ניהול 0.3%, ריבית 4.5%)' },
            },
            required: ['category', 'name', 'value'],
          },
        },
      },
      required: ['action', 'items'],
    },
  },
];

async function executeTool(name, input) {
  try {
    const handler = TOOL_HANDLERS[name];
    if (!handler) return { error: `כלי לא ידוע: ${name}` };
    return await handler(input);
  } catch (e) {
    return { error: e.message };
  }
}

// ─── Memory extraction prompt ───
const MEMORY_EXTRACT_PROMPT = `בהתבסס על השיחה הבאה, חלץ עובדות חשובות על המשתמש שכדאי לזכור לשיחות עתידיות.
החזר JSON בפורמט הבא בלבד (בלי markdown):
{"facts":["עובדה 1","עובדה 2"],"profile":{"age":null,"family":"","income":"","job":"","risk_level":"","goals":""}}
מלא רק שדות שיש עליהם מידע. אם אין מידע חדש, החזר {"facts":[],"profile":{}}`;

async function extractMemory(messages, existingMemory) {
  try {
    const lastMessages = messages.slice(-10);
    const convo = lastMessages.map(m => `${m.role === 'user' ? 'משתמש' : 'נועם'}: ${typeof m.content === 'string' ? m.content : '[קובץ]'}`).join('\n');

    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `זיכרון קיים:\n${JSON.stringify(existingMemory)}\n\nשיחה:\n${convo}\n\n${MEMORY_EXTRACT_PROMPT}`,
      }],
    });

    const text = res.content[0]?.text || '';
    const parsed = JSON.parse(text);

    const mergedFacts = [...new Set([...(existingMemory.facts || []), ...(parsed.facts || [])])];
    const mergedProfile = { ...(existingMemory.profile || {}), ...(parsed.profile || {}) };
    // Remove null/empty values from profile
    for (const key of Object.keys(mergedProfile)) {
      if (!mergedProfile[key]) delete mergedProfile[key];
    }

    return { facts: mergedFacts.slice(-50), profile: mergedProfile };
  } catch {
    return existingMemory;
  }
}

export async function POST(request) {
  const { messages } = await request.json();

  // Get user, memory, and past conversations
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const user = await getSessionUser(token);
  const memory = user ? await getUserMemory(user.id) : { facts: [], profile: {} };

  // Build memory + history context
  let memoryBlock = '';

  // Full past conversations
  if (user) {
    const allConvs = await getUserConversations(user.id);
    const pastChats = Object.values(allConvs)
      .filter(c => c.messages && c.messages.length > 0)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    if (pastChats.length > 0) {
      memoryBlock += `\n\n═══════════════════════════════════════
## כל השיחות הקודמות עם ${user.name}
**יש לך גישה מלאה להיסטוריה.** תשתמש בה כדי לקשר מידע, לזכור מה דיברתם, ולהמשיך מאיפה שהפסקתם.\n\n`;

      for (const chat of pastChats) {
        const date = chat.updatedAt ? new Date(chat.updatedAt).toLocaleDateString('he-IL') : '';
        memoryBlock += `### 📅 ${date} — ${chat.title || 'שיחה'}\n`;

        for (const m of chat.messages) {
          const role = m.role === 'user' ? user.name : 'נועם';
          let text = '';
          if (typeof m.content === 'string') {
            text = m.content;
          } else if (Array.isArray(m.content)) {
            text = m.content.map(b => b.text || '').filter(Boolean).join(' ');
          }
          if (m._display) {
            const disp = Array.isArray(m._display) ? m._display : [m._display];
            const fileNames = disp.filter(b => b.type === 'file_info').map(b => `[📎 ${b.fileName}]`).join(' ');
            if (fileNames) text = fileNames + ' ' + text;
          }
          if (text) memoryBlock += `**${role}:** ${text}\n`;
        }
        memoryBlock += '\n---\n\n';
      }
    }
  }

  // User profile and facts
  if (memory.facts?.length > 0 || Object.keys(memory.profile || {}).length > 0) {
    memoryBlock += `\n═══════════════════════════════════════
## זיכרון — מה שאתה כבר יודע על ${user?.name || 'הלקוח'}
`;
    if (Object.keys(memory.profile || {}).length > 0) {
      const p = memory.profile;
      const parts = [];
      if (p.age) parts.push(`גיל: ${p.age}`);
      if (p.family) parts.push(`מצב משפחתי: ${p.family}`);
      if (p.job) parts.push(`תעסוקה: ${p.job}`);
      if (p.income) parts.push(`הכנסה: ${p.income}`);
      if (p.risk_level) parts.push(`רמת סיכון: ${p.risk_level}`);
      if (p.goals) parts.push(`יעדים: ${p.goals}`);
      if (parts.length > 0) memoryBlock += `**פרופיל:** ${parts.join(' | ')}\n`;
    }
    if (memory.facts?.length > 0) {
      memoryBlock += `**עובדות שנלמדו:**\n${memory.facts.map(f => `- ${f}`).join('\n')}`;
    }
  }

  if (memoryBlock) {
    memoryBlock += `\n\n**הנחיות:** השתמש בכל המידע הזה בצורה טבעית. אל תשאל שאלות שכבר יש לך תשובות עליהן. כשהלקוח שואל על שיחות קודמות — ציין תאריכים ותכנים. אם משהו השתנה, עדכן את הידע שלך.`;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let conversationMessages = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      try {
        while (true) {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8192,
            system: [{ type: 'text', text: SYSTEM_PROMPT + memoryBlock, cache_control: { type: 'ephemeral' } }],
            tools: TOOLS,
            messages: conversationMessages,
          });

          let textContent = '';
          const toolUses = [];

          for (const block of response.content) {
            if (block.type === 'text') {
              textContent += block.text;
            } else if (block.type === 'tool_use') {
              toolUses.push(block);
            }
          }

          if (textContent) {
            send({ type: 'text', content: textContent });
          }

          if (response.stop_reason === 'end_turn') {
            send({ type: 'done' });
            controller.close();
            return;
          }

          if (response.stop_reason === 'tool_use' && toolUses.length > 0) {
            for (const tool of toolUses) {
              if (tool.name === 'update_portfolio') {
                // Send portfolio update to client
                send({ type: 'portfolio_update', action: tool.input.action, items: tool.input.items });
              } else {
                send({ type: 'tool_call', name: tool.name, input: tool.input });
              }
            }

            conversationMessages.push({ role: 'assistant', content: response.content });

            const toolResults = [];
            for (const tool of toolUses) {
              if (tool.name === 'update_portfolio') {
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: tool.id,
                  content: JSON.stringify({ success: true, message: `עודכנו ${tool.input.items?.length || 0} נכסים בתמונת המצב` }),
                });
              } else {
                const result = await executeTool(tool.name, tool.input);
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: tool.id,
                  content: JSON.stringify(result),
                });
              }
            }

            conversationMessages.push({ role: 'user', content: toolResults });
            send({ type: 'tool_done' });
            continue;
          }

          send({ type: 'done' });
          controller.close();
          return;
        }
      } catch (error) {
        send({ type: 'error', content: error.message });
        controller.close();
      }

      // Extract memory in background (don't block response)
      if (user) {
        extractMemory(conversationMessages, memory).then(async (newMemory) => {
          if (newMemory.facts?.length > 0 || Object.keys(newMemory.profile || {}).length > 0) {
            await saveUserMemory(user.id, newMemory);
          }
        }).catch(() => {});
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

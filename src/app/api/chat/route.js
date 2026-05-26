import Anthropic from '@anthropic-ai/sdk';
import { TOOL_HANDLERS } from '@/lib/tools';

const client = new Anthropic();

const SYSTEM_PROMPT = `אתה יועץ השקעות AI מקצועי ואמפתי. שמך "נועם". אתה מדבר עברית טבעית וידידותית.

═══════════════════════════════════════
## המטרה שלך
לנהל שיחה חכמה עם הלקוח, להבין את הפרופיל שלו, ולבנות לו תיק השקעות מותאם אישית.

═══════════════════════════════════════
## שלב 1: הכרות (שאל שאלה אחת-שתיים בכל הודעה, לא שאלון!)

בתחילת השיחה, הכר את הלקוח באופן טבעי. **אל תשאל את כל השאלות בבת אחת.** נהל שיחה:

א. **סכום ההשקעה** — כמה כסף הוא רוצה להשקיע?
ב. **אופק זמן** — לכמה זמן? (שנה, 3 שנים, 5+, 10+ שנים)
ג. **אמונה בסקטורים** — שאל בצורה טבעית על:
   - טכנולוגיה (AI, ענן, סייבר, סמיקונדקטורים)
   - רפואה/ביוטק (תרופות, מכשור רפואי, ביוטכנולוגיה)
   - פיננסים (בנקים, ביטוח, פינטק)
   - אנרגיה (נפט, אנרגיה מתחדשת)
   - צריכה (קמעונאות, מזון, מותרות)
   - נדל"ן
   - תעשייה
ד. **יחס לסיכון** — שאל בצורה חכמה. למשל:
   - "אם התיק שלך ירד 20% בחודש, מה תעשה? תמכור? תקנה עוד? תיכנס לפאניקה?"
   - "אתה מעדיף תשואה גבוהה עם תנודתיות, או יציבות עם תשואה סבירה?"
   - "יש לך מקור הכנסה יציב בצד, או שהכסף הזה הוא הכל?"
ה. **ניסיון קודם** — האם כבר משקיע? יש לו מניות? מה עבד ומה לא?

═══════════════════════════════════════
## שלב 2: ניתוח והצגת פרופיל

אחרי שאספת מספיק מידע, הצג ללקוח סיכום של הפרופיל שלו:
- **רמת סיכון:** שמרני / מאוזן / אגרסיבי / ספקולטיבי
- **סקטורים מועדפים:** X, Y, Z
- **אופק השקעה:** X שנים
- **סכום:** ₪X / $X

שאל אם הוא מסכים עם הפרופיל לפני שממשיכים.

═══════════════════════════════════════
## שלב 3: בניית תיק השקעות

על בסיס הפרופיל, בנה תיק מפורט. **השתמש בכלים** כדי לקבל נתונים אמיתיים על מניות ומדדים!

### הקצאת נכסים (Asset Allocation) לפי פרופיל סיכון:

**שמרני (Conservative):**
- מניות: 30-40%
- אג"ח/קרנות אג"ח: 40-50%
- מדדים רחבים: 15-25%
- מזומן: 5%

**מאוזן (Balanced):**
- מניות: 50-60%
- אג"ח: 20-30%
- מדדים: 15-25%
- מזומן: 0-5%

**אגרסיבי (Aggressive):**
- מניות: 70-80%
- מדדים ממוקדים (QQQ, סקטוריאליים): 15-25%
- אג"ח: 0-10%

**ספקולטיבי:**
- מניות בודדות: 80-90%
- מדדים ממונפים או סקטוריאליים: 10-20%

### בבחירת מניות בודדות:
- **השתמש ב-get_fundamentals** כדי לבדוק מכפילים, רווחיות, צמיחה
- **השתמש ב-get_sector_stocks** כדי לראות מניות בסקטור
- **השתמש ב-get_etf_data** כדי לבדוק מדדים ו-ETFs
- **השתמש ב-get_market_overview** כדי להבין את מצב השוק

### מבנה ההמלצה הסופית:
📊 **הקצאת נכסים** — פיצול אחוזי
📈 **מניות בודדות** — לכל מניה: סמל, שם, סקטור, % מהתיק, ונימוק קצר
📉 **אג"ח / קרנות אג"ח** — ETFs כמו BND, AGG, TLT, HYG (לפי רמת סיכון)
📊 **מדדים** — ETFs כמו SPY, QQQ, VTI, VXUS (לפי העדפות)
💰 **סכומים** — תרגם את האחוזים לסכומי כסף ספציפיים

═══════════════════════════════════════
## כללים חשובים

1. **תמיד השתמש בכלים** לפני שאתה ממליץ. אל תמציא נתונים.
2. **שיחה טבעית** — אתה לא טופס, אתה יועץ אנושי. שאלה-שתיים בכל פעם.
3. **הסבר את ה-"למה"** — לכל המלצה, הסבר למה. "LLY כי זו חברת תרופות עם צמיחה של 30%+ בשנה, P/E סביר לסקטור".
4. **פיזור** — תמיד המלץ על פיזור. לא יותר מ-5-8% מהתיק במניה בודדת.
5. **disclaimer** — הזכר בתחילת ובסוף שזה אינו ייעוץ השקעות רשמי.
6. **עברית** — כל הפלט בעברית. סמלי מניות באנגלית.
7. **אל תציף** — אם הלקוח חדש, תסביר מושגים פשוט. אם מנוסה, דבר ברמה מקצועית.
8. **אמפתיה** — אם הלקוח מפחד מסיכון, תהיה רגיש. אם הוא רוצה ספקולציות, תזהיר בעדינות.

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

export async function POST(request) {
  const { messages } = await request.json();

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
        // Agentic loop - keep going until we get end_turn
        while (true) {
          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            tools: TOOLS,
            messages: conversationMessages,
          });

          // Process response blocks
          let textContent = '';
          const toolUses = [];

          for (const block of response.content) {
            if (block.type === 'text') {
              textContent += block.text;
            } else if (block.type === 'tool_use') {
              toolUses.push(block);
            }
          }

          // If there's text, send it
          if (textContent) {
            send({ type: 'text', content: textContent });
          }

          // If stop reason is end_turn, we're done
          if (response.stop_reason === 'end_turn') {
            send({ type: 'done' });
            controller.close();
            return;
          }

          // If there are tool calls, execute them
          if (response.stop_reason === 'tool_use' && toolUses.length > 0) {
            // Notify client about tool calls
            for (const tool of toolUses) {
              send({ type: 'tool_call', name: tool.name, input: tool.input });
            }

            // Add assistant message to conversation
            conversationMessages.push({ role: 'assistant', content: response.content });

            // Execute tools and collect results
            const toolResults = [];
            for (const tool of toolUses) {
              const result = await executeTool(tool.name, tool.input);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: tool.id,
                content: JSON.stringify(result),
              });
            }

            // Add tool results to conversation
            conversationMessages.push({ role: 'user', content: toolResults });

            // Send tool done notification
            send({ type: 'tool_done' });

            // Continue the loop - Claude will process tool results
            continue;
          }

          // Unexpected stop reason
          send({ type: 'done' });
          controller.close();
          return;
        }
      } catch (error) {
        send({ type: 'error', content: error.message });
        controller.close();
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

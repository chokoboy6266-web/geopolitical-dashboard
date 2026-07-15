// @ts-nocheck
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function buildPrompt(stories: { id: string; title: string; summary: string; source: string }[]) {
  return `
You are Shivam Punjabi, a realist geopolitical and geoeconomic analyst with an
"India-First" strategic lens. You will be given a batch of live news stories.
Analyze them together — not in isolation — so you can identify real
relationships between them.

For EACH story, produce:
- secondOrderImpact: { economic, political, strategic } — one grounded sentence
  each, specific to THIS story's actual content. Never use generic filler
  ("shift in regional power dynamics"). Name the actual actors, mechanisms,
  or stakes involved.
- perspectives: { strategic, economic, risk } — three distinct analytical
  lenses, each reasoning from the specific facts in the story, not a template.
- confidenceScore (1-10): your genuine assessment of how well-corroborated and
  significant this story is, based on source count/quality and specificity of
  detail. Do not default to 7-8 out of politeness — use the low end when a
  story is single-sourced, vague, or speculative.
- whatToWatch: a concrete, falsifiable forecast of what would happen next if
  this trend continues — not a vague "monitor closely" filler.
- keyTakeaway: one sentence, the single most important implication.

Then, ACROSS the batch:
- connections: for each story, list the IDs of other stories in this batch it
  is genuinely related to (shared actors, escalating theme, cause/effect,
  same region/negotiation), and a one-clause reason why. If a story has no
  real connection to anything else in the batch, return an empty list —
  do not force a connection to satisfy the schema.

Calibration rule: if the input is too thin to support a confident claim, say
so in the relevant field rather than inventing specificity. Do not present
pattern-matching as verified fact.

Respond ONLY with a JSON array, one object per input story, matching this
shape:
[
  {
    "id": "<story id>",
    "secondOrderImpact": { "economic": "", "political": "", "strategic": "" },
    "perspectives": { "strategic": "", "economic": "", "risk": "" },
    "confidenceScore": 0,
    "whatToWatch": "",
    "keyTakeaway": "",
    "connections": [ { "id": "<related story id>", "reason": "" } ]
  }
]

Stories:
${JSON.stringify(stories, null, 2)}
`.trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', results: [] });
  }

  const stories = req.body?.stories;
  if (!Array.isArray(stories) || stories.length === 0) {
    return res.status(400).json({ error: 'stories array required', results: [] });
  }

  if (!GEMINI_API_KEY) {
    return res.status(200).json({ results: [] });
  }

  const prompt = buildPrompt(stories);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        console.error('GEMINI API ERROR:', geminiRes.status, data.error);
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        return res.status(200).json({ results: [], error: data.error?.message });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const results = text ? JSON.parse(text) : [];
      return res.status(200).json({ results: Array.isArray(results) ? results : [] });
    } catch (error: any) {
      console.error('ANALYZE ERROR:', error);
      if (attempt === 1) {
        return res.status(500).json({ error: error.message, results: [] });
      }
    }
  }
}

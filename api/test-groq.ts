// @ts-nocheck
const GROQ_API_KEY = process.env.GROK_API_KEY;

export default async function handler(req: any, res: any) {
  try {
    if (!GROQ_API_KEY) {
      return res.status(200).json({ keyPresent: false });
    }
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Say hello in one word.' }]
      })
    });
    const data = await r.json();
    return res.status(200).json({ keyPresent: true, groqStatus: r.status, data });
  } catch (error: any) {
    return res.status(500).json({ caught: true, error: error.message, stack: error.stack });
  }
}

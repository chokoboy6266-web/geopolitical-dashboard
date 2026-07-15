// @ts-nocheck
export default async function handler(req: any, res: any) {
  const { text, action, key } = req.query;
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const APPROVE_SECRET = process.env.APPROVE_SECRET;
  const CHANNEL_ID = '@IndiaWorldIntel'; // Public channel username

  if (!APPROVE_SECRET || key !== APPROVE_SECRET) {
    return res.status(403).send('<h1>Forbidden</h1>');
  }

  if (action === 'ignore') {
    return res.status(200).send('<h1>Action Ignored</h1>');
  }

  if (!text) {
    return res.status(200).send('<h1>Error</h1><p>No text found.</p>');
  }

  try {
    const finalIntel = text as string;
    
    // Formatting the "Broadcast" version for a public audience
    const broadcastMessage = `
📢 *INTELLIGENCE BRIEFING* 📢
--------------------------------
${finalIntel}

🌐 *Channel:* [India & World Intel](https://t.me/IndiaWorldIntel)
🕒 *Timestamp:* ${new Date().toUTCString()}
--------------------------------
#India #GlobalNews #Geopolitics #Analysis
    `.trim();

    // Send to Public Channel
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text: broadcastMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.description || 'Channel broadcast failed');
    }

    return res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #f4f7f6;">
        <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); display: inline-block;">
          <h1 style="color: #2ecc71;">🏁 LIVE ON CHANNEL!</h1>
          <p style="font-size: 1.1rem; color: #34495e;">The briefing has been published to <strong>@IndiaWorldIntel</strong>.</p>
          <br/>
          <a href="https://t.me/IndiaWorldIntel" target="_blank" style="background: #0088cc; color: white; padding: 12px 25px; border-radius: 25px; text-decoration: none; font-weight: bold;">View Channel</a>
        </div>
      </div>
    `);

  } catch (error: any) {
    console.error('BROADCAST ERROR:', error);
    return res.status(200).send(`
      <div style="font-family: sans-serif; padding: 30px; color: #e74c3c;">
        <h1>❌ Broadcast Failed</h1>
        <p>${error.message}</p>
        <p>Tip: Make sure the bot is an <strong>Administrator</strong> in the channel.</p>
      </div>
    `);
  }
}

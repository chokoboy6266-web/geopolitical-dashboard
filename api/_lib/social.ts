// @ts-nocheck
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;
const THREADS_ACCESS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const THREADS_USER_ID = process.env.THREADS_USER_ID;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

export async function postToBluesky(text: string): Promise<void> {
  if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) return;
  try {
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD })
    });
    const session = await sessionRes.json();
    if (!session.accessJwt) throw new Error(session.message || 'Bluesky login failed');

    const record = {
      $type: 'app.bsky.feed.post',
      text: truncate(text, 300),
      createdAt: new Date().toISOString()
    };

    const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessJwt}`
      },
      body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record })
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(postData.message || 'Bluesky post failed');
  } catch (e) {
    console.error('Bluesky Error:', e);
  }
}

export async function postToThreads(text: string): Promise<void> {
  if (!THREADS_ACCESS_TOKEN || !THREADS_USER_ID) return;
  try {
    const createRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'TEXT',
        text: truncate(text, 500),
        access_token: THREADS_ACCESS_TOKEN
      })
    });
    const createData = await createRes.json();
    if (!createData.id) throw new Error(createData.error?.message || 'Threads container creation failed');

    const publishRes = await fetch(`https://graph.threads.net/v1.0/${THREADS_USER_ID}/threads_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: createData.id,
        access_token: THREADS_ACCESS_TOKEN
      })
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) throw new Error(publishData.error?.message || 'Threads publish failed');
  } catch (e) {
    console.error('Threads Error:', e);
  }
}

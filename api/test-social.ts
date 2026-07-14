// @ts-nocheck
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

export default async function handler(req: any, res: any) {
  const diagnostic: any = {
    handlePresent: !!BLUESKY_HANDLE,
    passwordPresent: !!BLUESKY_APP_PASSWORD,
    handleLength: BLUESKY_HANDLE ? BLUESKY_HANDLE.length : 0,
    passwordLength: BLUESKY_APP_PASSWORD ? BLUESKY_APP_PASSWORD.length : 0
  };

  if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
    return res.status(200).json({ ...diagnostic, result: 'skipped - env vars missing' });
  }

  try {
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD })
    });
    const session = await sessionRes.json();
    diagnostic.loginStatus = sessionRes.status;
    diagnostic.loginOk = !!session.accessJwt;
    if (!session.accessJwt) {
      diagnostic.loginError = session.message || session.error || 'unknown';
      return res.status(200).json(diagnostic);
    }

    const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessJwt}` },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: { $type: 'app.bsky.feed.post', text: '🔧 diagnostic test (auto-deleting)', createdAt: new Date().toISOString() }
      })
    });
    const postData = await postRes.json();
    diagnostic.postStatus = postRes.status;
    diagnostic.postOk = postRes.ok;
    diagnostic.postResponse = postData;

    if (postData.uri) {
      const rkey = postData.uri.split('/').pop();
      await fetch('https://bsky.social/xrpc/com.atproto.repo.deleteRecord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessJwt}` },
        body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', rkey })
      });
      diagnostic.cleanedUp = true;
    }

    return res.status(200).json(diagnostic);
  } catch (error: any) {
    diagnostic.exception = error.message;
    return res.status(500).json(diagnostic);
  }
}

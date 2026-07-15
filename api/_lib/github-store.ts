// @ts-nocheck
const GITHUB_TOKEN = process.env.Github;
const REPO = 'chokoboy6266-web/geopolitical-dashboard';

export async function getJsonFile(path: string): Promise<any[]> {
  if (!GITHUB_TOKEN) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString().trim();
    return JSON.parse(content || '[]');
  } catch (e) {
    console.error(`Failed to get ${path}:`, e);
    return [];
  }
}

export async function updateJsonFile(path: string, items: any[], commitMessage: string): Promise<void> {
  if (!GITHUB_TOKEN) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });
    let sha = '';
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }
    const content = JSON.stringify(items, null, 2);
    await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: Buffer.from(content).toString('base64'),
        sha
      })
    });
  } catch (e) {
    console.error(`Failed to update ${path}:`, e);
  }
}

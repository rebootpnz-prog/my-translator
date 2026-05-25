export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No API key' });

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: 'gpt-realtime',
          audio: { output: { voice: 'ash' } }
        }
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: JSON.stringify(data) });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
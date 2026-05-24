export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No text' });

  try {
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `Ты профессиональный переводчик и лингвист.
Получаешь английский текст и возвращаешь ТОЛЬКО JSON без markdown:
{
  "translation": "перевод на русский",
  "explanation": "краткий разбор на русском: устойчивые обороты, идиомы, грамматические особенности, смысловое значение. Если ничего особенного нет — напиши 'Стандартная фраза.'"
}`
          },
          { role: 'user', content: text }
        ],
      }),
    });

    const data = await chatRes.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    res.status(200).json({
      translation: parsed.translation || '',
      explanation: parsed.explanation || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

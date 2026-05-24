import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  try {
    // 1. Парсим загруженный аудиофайл
    const form = formidable({ keepExtensions: true });
    const [, files] = await form.parse(req);
    const audioFile = files.audio?.[0];
    if (!audioFile) return res.status(400).json({ error: 'No audio file' });

    // 2. Whisper — транскрипция
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFile.filepath), {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    });
    formData.append('model', 'whisper-1');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, ...formData.getHeaders() },
      body: formData,
    });
    const whisperData = await whisperRes.json();
    const transcript = whisperData.text?.trim();
    if (!transcript) return res.status(200).json({ transcript: '', translation: '', explanation: '' });

    // 3. ChatGPT — перевод + разбор одним запросом
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `Ты профессиональный переводчик и лингвист. 
Получаешь английский текст и возвращаешь ТОЛЬКО JSON без markdown и пояснений:
{
  "translation": "перевод на русский",
  "explanation": "краткий разбор на русском: устойчивые обороты, идиомы, грамматические особенности, смысловое значение. Если ничего особенного нет — напиши 'Стандартная фраза.'"
}`
          },
          { role: 'user', content: transcript }
        ],
      }),
    });

    const chatData = await chatRes.json();
    const raw = chatData.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    fs.unlinkSync(audioFile.filepath);

    res.status(200).json({
      transcript,
      translation: parsed.translation || '',
      explanation: parsed.explanation || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

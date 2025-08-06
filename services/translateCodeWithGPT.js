const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translateCodesWithGPT(tickets) {
    const prompt = `Ты переводчик кодов IATA и авиакомпаний. Преобразуй массив билетов ниже:

${JSON.stringify(tickets, null, 2)}

Верни ТОЛЬКО массив объектов в следующем формате:
[
  {
    iata: 'BCN',
    city: 'Barcelona',
    airline: 'FR',
    airline_name: 'Ryanair',
    departure: '2025-08-07',
    return: '2025-08-10'
  }
]

На английском языке. Код EAP = Basel, Switzerland.
К городу всегда указывай страну через запятую.
Без пояснений, текста до или после.`;

    const res = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
    });


    const raw = res.choices[0]?.message?.content;

    // 🧹 Вырезаем JSON-массив из текста
    const jsonMatch = raw.match(/\[\s*{[\s\S]*}\s*]/);
    if (!jsonMatch) {
        console.error('[GPT PARSE ERROR] Ответ не содержит JSON-массив:', raw);
        return [];
    }

    try {
        return JSON.parse(jsonMatch[0]);
    } catch (err) {
        console.error('[GPT PARSE ERROR]', err.message);
        return [];
    }
}

// Новая функция для поиска ближайшего международного аэропорта
async function getNearestFlightableAirport(iata) {
    const prompt = `The IATA code ${iata} is not flightable. What is the nearest international airport IATA code? Return ONLY the IATA code in uppercase letters, no explanations.`;

    try {
        const res = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
        });

        const reply = res.choices[0]?.message?.content.trim();
        // Проверяем, что ответ — три заглавные буквы IATA кода
        const match = reply.match(/^[A-Z]{3}$/);
        if (match) {
            return match[0];
        } else {
            console.error('[getNearestFlightableAirport] Unexpected GPT reply:', reply);
            return null;
        }
    } catch (err) {
        console.error('[getNearestFlightableAirport] GPT error:', err);
        return null;
    }
}

module.exports = { translateCodesWithGPT, getNearestFlightableAirport };

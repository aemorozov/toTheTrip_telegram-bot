const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function translateCodesWithGPTRoundTrip(tickets) {
  const prompt = `Ты переводчик кодов IATA и авиакомпаний. Преобразуй массив билетов ниже:
${JSON.stringify(tickets, null, 2)}
Верни ТОЛЬКО массив объектов в следующем формате:
[{iata: 'BCN',city: 'Barcelona',departure: '15 Sep 2025',departure_time: '22:20', return: '16 Sep 2025',return_time:'12:30', price: "17"}]
Без символов \n и +, только читсый json.
На английском языке. 
Код EAP = Basel, CH.
Код RMO = Chișinău, MD.
К городу всегда указывай страну в виде RU, IT и так далее через запятую.
Без пояснений, текста до или после.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const raw = res.choices[0]?.message?.content;

  // 🧹 Вырезаем JSON-массив из текста
  const jsonMatch = raw.match(/\[\s*{[\s\S]*}\s*]/);
  if (!jsonMatch) {
    console.error("[GPT PARSE ERROR] Ответ не содержит JSON-массив:", raw);
    return [];
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[GPT PARSE ERROR]", err.message);
    return [];
  }
}

module.exports = { translateCodesWithGPTRoundTrip };

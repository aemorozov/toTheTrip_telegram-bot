const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getIataCode(city) {
  const prompt = `Какой IATA-код у города или аэропорта "${city}"? 
    Если нет такого, то поищи ближайший аэропорт, из которого летают регулярные международные рейсы и верни его. 
    Ответь строго в таком формате кодом и названием города, например: MOW,Moscow`;

  const res = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-5-mini",
  });

  const code = res.choices[0].message.content.trim().toUpperCase();
  return code ? code.split(",") : null;
}

module.exports = { getIataCode };

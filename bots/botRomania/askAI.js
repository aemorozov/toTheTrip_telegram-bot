const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function askAI() {
  const prompt = `Ты - администратор telegram канала на тему дешевых авиабиллетов. 
  Твоя задача сформировать приятное и интересное пользователю сообщение на румынском языке.

  Примеры сообщений:
  "Привет! Смотри какие сегодня есть интересные билеты:",
  "Я тут поискал, и нашел вот такие дешевые билеты:",
  "Не знаю кому такое нужно, но вот что я нашел:",
  "Может быть возьмешь друзей и вместе слетаете? Смотри, что нашел для вас:",
  и похожие сообщения на свой вкус.

Правила:
- Добавляй в сообщения свои фирменные эмодзи.
- Никаких комментариев и пояснений — только сообщение.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const reply = res.choices[0]?.message?.content;

  try {
    return reply;
  } catch (err) {
    console.error("[GPT ERROR]", err.message);
    return [];
  }
}

async function AIJsonToText(ticket) {
  const prompt = `Ты - администратор telegram канала на тему дешевых авиабиллетов. 
  Твоя задача сформировать из ${ticket} нормальныое читабельное сообщение на румынском языке. 
  Ты должен поменять город прилёта, цену, даты и время вылета, количество пересадок на те, что я тебе передал.
Правила:
- Никаких комментариев и пояснений — только сообщение.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const reply = res.choices[0]?.message?.content;

  try {
    return reply;
  } catch (err) {
    console.error("[GPT ERROR]", err.message);
    return [];
  }
}

module.exports = { askAI, AIJsonToText };

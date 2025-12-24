import OpenAI from "openai";
const { Redis } = require("@upstash/redis");
let redis = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "⚠️ Upstash env vars missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
    );
  } else {
    redis = new Redis({ url, token });
  }
} catch (err) {
  console.error("❌ Error initializing Upstash Redis client:", err);
  redis = null;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const REDIS_KEY = "Italy:last_titles";
const language = "it";
const footerText = `\n📢 Condividilo con gli amici!\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">Il tuo bot per voli economici</a></b>`;

async function getLastTitles(redis) {
  return await redis.lrange(REDIS_KEY, 0, 9); // последние 10
}

async function saveTitle(redis, title) {
  await redis.lpush(REDIS_KEY, title);
  await redis.ltrim(REDIS_KEY, 0, 9);
}

async function getGPTTitle(tickets) {
  const samples = [
    "Думаем, чем займемся в январе:",
    "Жители Бухареста окажутся у моря уже завтра",
    "Мини-сборки для наших любимых путешественников:",
    "Еще горячая подборка:",
    "Горячий пирожок для Петербурга",
    "Туда, где тепло: 6 ночей в ОАЭ из Екатеринбурга за 24400 рублей с человека!",
    "А для самых быстрых есть дешёвые тикеты в Египет:",
    "Праздник к нам приходит:",
    "Давно мы уже такого не видели: прямые рейсы из Краснодара в Грузию",
    "Держим путь в Питер: прямые рейсы из Екб",
    "Кто там просил недорогие билеты в Америку?",
    "Дед Мороз заезжал в наш офис в Новосибирске и просил передать подарок для хороших мальчиков и девочек:",
    "Все дороги ведут в Египет:",
    "Летим смотреть предновогоднюю Турцию:",
    "Сибиряки, тут раздают дешёвые билеты:",
    "Пермяки, встречаем Новый год на берегу Красного моря:",
    "Едем на Кавказ: прямые декабрьские рейсы из Бухареста,",
    "Вот она, настоящая халява:",
    "Давненько мы уже не писали про билеты из Москвы на Филиппины!",
  ];

  const lastTitles = await getLastTitles(redis);

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content: `You are a professional travel copywriter for Telegram channels.`,
      },
      {
        role: "user",
        content: `Rules:
- Generate SHORT, emotional, unusual ONE headline about all flights ${tickets}
- Strong about 100 characters in that headline, not more.
- Sound natural and human
- Use emoji (1-2) in start of title
- DO NOT use lies
- Headlines must feel written by a real person
- All flights are round trip, use it
- Use that language: ${language}
- Samples for styling: ${samples}
- Do not repeat last titles: ${lastTitles} and emodjis
- Do not use abbreviations`,
      },
    ],
    temperature: 1,
  });

  const title = response.choices[0].message.content.trim();

  await saveTitle(redis, title);

  return title;
}

const preMessage = {
  header({ origin, price, destinationName = null }) {
    return `<b>${title} ${origin}${
      destinationName ? ` verso ${destinationName.toUpperCase()}` : ""
    } da ${price}€</b>\n`;
  },

  directFlights() {
    return `\n<b>Voli diretti:</b>\n`;
  },

  tramsferFlights() {
    return `\n<b>Voli con scalo:</b>\n`;
  },

  flightItem({
    originName,
    destinationName,
    price,
    depDate,
    depTime,
    depTransfers,
    retDate,
    retTime,
    retTransfers,
    link,
    short,
  }) {
    return `
✈️ <b>${originName}</b> ⇄ <b>${destinationName}</b>
💶 approx. <b>${price}€</b>
📅 <b>${depDate}  🕓 ${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}  🕓 ${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return footerText;
  },
};

module.exports = { preMessage, getGPTTitle };

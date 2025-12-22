import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const today = new Date();

const titles = [
  "💸 TOP zboruri dus-intors la cele mai mici prețuri din",
  "🏆 Cele mai bune oferte dus-intors din",
  "🔥 Cele mai tari oferte la zboruri dus-intors din",
  "✈️ Zboruri dus-intors accesibile din",
  "📉 Cele mai mici tarife dus-intors acum din",
  "🛫 Zboara smart — cele mai bune prețuri din",
  "💰 Oferte ieftine de neratat la zboruri dus-intors din",
  "🌍 TOP oferte de calatorie dus-intors din",
  "🎯 Cele mai ieftine destinații din",
  "⭐ Cele mai bune oferte dus-intors din",
];

const hashtags = [
  // 🌍 English SEO
  "#CheapFlights",
  "#CheapTickets",
  "#LowCost",
  "#CheapTravel",
  "#Travel",
  "#Cheap",
  "#Flights",
  "#Tickets",
  "#Discount",
  "#TravelEurope",
  "#Trip",

  // 🇷🇴 Romanian (no diacritics)
  "#Bilete",
  "#Zboruri",
  "#Calatorii",
  "#Oferte",
  "#Romania",
  "#Avion",
  "#Europa",
  "#Weekend",

  // 🛫 Airlines (часто ищут)
  "#WizzAir",
  "#Ryanair",
  "#BlueAir",
  "#Tarom",
  "#Lufthansa",
  "#TurkishAirlines",
  "#AustrianAirlines",
  "#KLM",
  "#AirFrance",
  "#LOT",
  "#QatarAirways",
  "#Emirates",
  "#BritishAirways",
  "#AirSerbia",
  "#AegeanAirlines",
  "#PegasusAirlines",
  "#FlyDubai",
  "#EasyJet",
  "#SwissAir",
  "#AirBaltic",
];

// ✈️ Функция для выбора случайных 5 хэштегов
function getRandomHashtags(count = 7) {
  const shuffled = [...hashtags].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).join(" ");
}

async function getGPTTitle(tickets, language) {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content: `
You are a professional travel copywriter for Telegram channels.
Your task:
- Generate SHORT, catchy, emotional headlines
- Avoid clichés and шаблонные фразы
- Sound natural, bold, and human
- Make clickbate titles
- DO NOT repeat previous patterns
- DO NOT mention airlines unless explicitly requested
- DO NOT use lies
- DO NOT use that format: Бухарест → Кишинёв: €48
- Headlines must feel written by a real person
- Max 60 chars
- Today is ${today}

Avoid clichés and repetition. Avoid similarity with previous headlines
`,
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "generate_headline",
          language,
          tickets,
        }),
        instructions: [
          "Do not start with the weekday",
          "Avoid words: 'скидка', 'успей', 'горячие'",
          "Use casual spoken language",
        ],
        style: {
          tone: "bold",
          emoji_level: 1,
          urgency_level: 2,
        },
      },
    ],
    temperature: 1,
  });

  return response.choices[0].message.content;
}

function getFlightDigestTitle() {
  const now = new Date();
  const hour = now.getHours();

  const weekdays = [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ];

  const weekdayStr = weekdays[now.getDay()];

  const morning = [
    `Кажется сегодня ${weekdayStr.toLowerCase()}? Вот и наша утренняя подборка лучших билетов ✈️`,
    `🌅 Доброе утро! Держи свежую подборку выгодных билетов!`,
    `Врываемся в ${weekdayStr.toLowerCase()} с дешевыми билетами прямо с утра!`,
    `☕️ Утренний улёт: сегодня ${weekdayStr.toLowerCase()}, а значит мы ловим приятные цены на билеты`,
    `💡 Давай утром посмотрим куда можно улететь!`,
    `🔥 Вот это утро! Держи маршруты, за которые не стыдно`,
  ];

  const evening = [
    `${weekdayStr}, вечер? Отличное время глянуть куда можно сорваться ✈️🔥`,
    `🌇 Добрый вечер! Пора расслабиться и посмотреть лучшие билеты на сегодня 😉`,
    `Ну что, ${weekdayStr.toLowerCase()} почти позади — кто-то заслужил себе маленькое приключение!`,
    `✨ Вечерний улёт: дешёвые билеты, уютная атмосфера и лёгкая мечта о путешествиях.`,
    `😎 Пока другие идут спать — мы выбираем направления. Лови свежую вечернюю подборку!`,
    `🌘 Сегодня ${weekdayStr.toLowerCase()} и моё настроение улететь — 100%. А что думаешь ты?`,
    `🔥 Вечер — время сильных решений. Вот куда можно улететь, если немного рискнуть 😉`,
  ];

  const isMorning = hour >= 6 && hour < 12;
  const list = isMorning ? morning : evening;

  return list[Math.floor(Math.random() * list.length)];
}

const title = titles[Math.floor(Math.random() * titles.length)];
const randomHashtags = getRandomHashtags(7);
const exchange = 5;

const preMessage = {
  header({ origin, price, destinationName = null }) {
    return `<b>${title} ${origin}${
      destinationName ? ` catre ${destinationName.toUpperCase()}` : ""
    } de la ${price * exchange}RON</b>\n`;
  },

  directFlights() {
    return `\n<b>Zboruri directe:</b>\n`;
  },

  tramsferFlights() {
    return `\n<b>Zboruri cu escală:</b>\n`;
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
💶 aprox. <b>${price * exchange} RON</b> (${price}€)
📅 <b>${depDate}  🕓 ${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}  🕓 ${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return `\n📢 Distribuie prietenilor!\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>\n\n${randomHashtags}`;
  },
};

module.exports = { preMessage, getFlightDigestTitle, getGPTTitle };

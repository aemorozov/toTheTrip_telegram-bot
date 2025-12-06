const titles = [
  "💸 TOP voli andata e ritorno ai prezzi più bassi da",
  "🏆 Le migliori offerte andata e ritorno da",
  "🔥 Le migliori offerte sui voli andata e ritorno da",
  "✈️ Voli andata e ritorno convenienti da",
  "📉 Le tariffe andata e ritorno più basse ora da",
  "🛫 Vola smart — i migliori prezzi da",
  "💰 Offerte imperdibili di voli andata e ritorno da",
  "🌍 TOP offerte di viaggio andata e ritorno da",
  "🎯 Le destinazioni più economiche da",
  "⭐ Le migliori offerte andata e ritorno da",
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
  "#Biglietti",
  "#Voli",
  "#Viaggi",
  "#Offerte",
  "#Italia",
  "#Aereo",
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

function getFlightDigestTitle() {
  const now = new Date();
  const hour = now.getHours();

  const weekdays = [
    "Lunedì", // Понедельник
    "Martedì", // Вторник
    "Mercoledì", // Среда
    "Giovedì", // Четверг
    "Venerdì", // Пятница
    "Sabato", // Суббота
    "Domenica", // Воскресенье
  ];

  const weekdayStr = weekdays[now.getDay() - 1];

  const morning = [
    `Sembra proprio che oggi sia ${weekdayStr.toLowerCase()}… ecco la nostra selezione mattutina dei voli migliori ✈️`,
    `🌅 Buongiorno! Ecco una selezione fresca fresca delle migliori offerte di oggi!`,
    `Iniziamo questo ${weekdayStr.toLowerCase()} con voli economici fin dal mattino!`,
    `☕️ Decollo mattutino: è ${weekdayStr.toLowerCase()}, quindi è il momento perfetto per approfittare dei prezzi migliori ✈️`,
    `💡 Perché non dare un’occhiata stamattina a dove si può volare?`,
    `🔥 Che inizio di giornata! Ecco degli itinerari di cui andare fieri 😉`,
  ];

  const evening = [
    `${weekdayStr} sera? Momento perfetto per scoprire dove si può scappare ✈️🔥`,
    `🌇 Buonasera! È l’ora di rilassarsi… e di guardare le migliori offerte del giorno 😉`,
    `E allora… questo ${weekdayStr.toLowerCase()} sta per finire — forse è il momento giusto per programmare una piccola avventura?`,
    `✨ Volo serale: offerte interessanti, atmosfera tranquilla e un pizzico di voglia di partire…`,
    `😎 Mentre gli altri vanno a dormire, noi scegliamo nuove destinazioni. Ecco la selezione della sera!`,
    `🌘 È ${weekdayStr.toLowerCase()} e la mia voglia di viaggiare è al 100%. E la tua?`,
    `🔥 La sera è il momento delle decisioni coraggiose. Ecco dove potresti andare, se vuoi osare 😉`,
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
    return `\n📢 Condividi con gli amici!\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>\n\n${randomHashtags}`;
  },
};

module.exports = { preMessage, getFlightDigestTitle };

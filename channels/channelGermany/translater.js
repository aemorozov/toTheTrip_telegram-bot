const titles = [
  "💸 TOP Hin- und Rückflüge zu den niedrigsten Preisen ab",
  "🏆 Die besten Hin- und Rückflugangebote ab",
  "🔥 Die besten Angebote für Hin- und Rückflüge ab",
  "✈️ Günstige Hin- und Rückflüge ab",
  "📉 Die aktuell niedrigsten Hin- und Rückflugtarife ab",
  "🛫 Clever fliegen — die besten Preise ab",
  "💰 Unschlagbare Angebote für Hin- und Rückflüge ab",
  "🌍 TOP Reiseangebote für Hin- und Rückflüge ab",
  "🎯 Die günstigsten Reiseziele ab",
  "⭐ Die besten Hin- und Rückflugangebote ab",
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
  "#Tickets",
  "#Flüge",
  "#Reisen",
  "#Angebote",
  "#Deutschland",
  "#Flugzeug",
  "#Europa",
  "#Wochenende",

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

// ✈️ Функция для выбора случайных 7 хэштегов
function getRandomHashtags(count = 7) {
  const shuffled = [...hashtags].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).join(" ");
}

function getFlightDigestTitle() {
  const now = new Date();
  const hour = now.getHours();

  const weekdays = [
    "Montag", // Понедельник
    "Dienstag", // Вторник
    "Mittwoch", // Среда
    "Donnerstag", // Четверг
    "Freitag", // Пятница
    "Samstag", // Суббота
    "Sonntag", // Воскресенье
  ];

  const weekdayStr = weekdays[now.getDay() - 1];

  const morning = [
    `Ist heute etwa ${weekdayStr.toLowerCase()}? Zeit für unsere morgendliche Auswahl der besten Flugangebote ✈️`,
    `🌅 Guten Morgen! Hier kommt deine frische Auswahl an tollen Flugdeals!`,
    `Starten wir in diesen ${weekdayStr.toLowerCase()} mit günstigen Flügen gleich am Morgen!`,
    `☕️ Morgenabflug: Es ist ${weekdayStr.toLowerCase()} – perfekte Zeit, um die besten Preise mitzunehmen ✈️`,
    `💡 Lass uns heute Morgen schauen, wohin man spontan wegfliegen könnte!`,
    `🔥 Was für ein Start in den Tag! Hier sind Routen, auf die man stolz sein kann 😉`,
  ];

  const evening = [
    `${weekdayStr} am Abend? Perfekt, um zu schauen, wohin man spontan entfliehen kann ✈️🔥`,
    `🌇 Guten Abend! Zeit zum Entspannen — und für die besten Flugangebote des Tages 😉`,
    `Na, der ${weekdayStr.toLowerCase()} geht langsam zu Ende… vielleicht Zeit für ein kleines Abenteuer?`,
    `✨ Abendflüge: gute Deals, gemütliche Stimmung und ein leiser Wunsch nach Fernweh…`,
    `😎 Während andere schlafen gehen, wählen wir Reiseziele. Hier ist die abendliche Auswahl!`,
    `🌘 Es ist ${weekdayStr.toLowerCase()} und mein Reiselust-Level liegt bei 100 %. Und deins?`,
    `🔥 Abends trifft man die mutigsten Entscheidungen. Hier ein paar Ziele, falls du dich traust 😉`,
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
      destinationName ? ` nach ${destinationName.toUpperCase()}` : ""
    } ab ${price}€</b>\n`;
  },

  directFlights() {
    return `\n<b>Direktflüge:</b>\n`;
  },

  tramsferFlights() {
    return `\n<b>Flüge mit Zwischenstopp:</b>\n`;
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
💶 circa <b>${price}€</b>
📅 <b>${depDate}  🕓 ${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}  🕓 ${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return `\n📢 Teile es mit deinen Freunden!\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>\n\n${randomHashtags}`;
  },
};

module.exports = { preMessage, getFlightDigestTitle };

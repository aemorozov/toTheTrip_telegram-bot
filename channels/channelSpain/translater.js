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
  "#Billetes",
  "#Vuelos",
  "#Viajes",
  "#Ofertas",
  "#España",
  "#Avión",
  "#Europa",
  "#FinDeSemana",

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

const title = titles[Math.floor(Math.random() * titles.length)];
const randomHashtags = getRandomHashtags(7);
const exchange = 5;

const preMessage = {
  header({ origin, price, destinationName = null }) {
    return `<b>${title} ${origin}${
      destinationName ? ` hacia ${destinationName.toUpperCase()}` : ""
    } desde ${price * exchange} EUR</b>\n`;
  },

  directFlights() {
    return `\n<b>Vuelos directos:</b>\n`;
  },

  tramsferFlights() {
    return `\n<b>Vuelos con escala:</b>\n`;
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
💶 aprox. <b>${price}€</b>
📅 <b>${depDate}  🕓 ${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}  🕓 ${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return `\n📢 ¡Compártelo con tus amigos!\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>\n\n${randomHashtags}`;
  },
};

module.exports = { preMessage };

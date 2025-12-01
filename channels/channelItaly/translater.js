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

module.exports = { preMessage };

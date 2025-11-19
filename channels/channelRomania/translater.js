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

const title = titles[Math.floor(Math.random() * titles.length)];
const randomHashtags = getRandomHashtags(7);

const preMessage = {
  header({ origin, price, destinationName = null }) {
    return `<b>${title} ${origin}${
      destinationName ? ` catre ${destinationName.toUpperCase()}` : ""
    } de la ${price}€</b>\n`;
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
✈️ <b>${originName}</b> - <b>${destinationName}</b>
💸 aprox. <b>${price}€</b>
📅 <b>${depDate}</b>  🕐 <b>${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}</b>  🕐 <b>${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return `\n📢 Distribuie prietenilor!\n\n🤖 <b>@CheapFlightsToTheTripBot</b> - botul tău pentru zboruri ieftine\n\n${randomHashtags}`;
  },
};

module.exports = { preMessage };

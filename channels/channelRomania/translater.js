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

function getFlightDigestTitle() {
  const now = new Date();
  const hour = now.getHours();

  const weekdays = [
    "Luni", // Понедельник
    "Marți", // Вторник
    "Miercuri", // Среда
    "Joi", // Четверг
    "Vineri", // Пятница
    "Sâmbătă", // Суббота
    "Duminică", // Воскресенье
  ];

  const weekdayStr = weekdays[now.getDay() - 1];

  const morning = [
    `Se pare că azi e ${weekdayStr.toLowerCase()}… Iată selecția noastră matinală cu cele mai bune bilete ✈️`,
    `🌅 Bună dimineața! Uite o selecție proaspătă cu cele mai bune oferte de azi!`,
    `Începem acest ${weekdayStr.toLowerCase()} cu zboruri ieftine încă de dimineață!`,
    `☕️ Decolare matinală: e ${weekdayStr.toLowerCase()}, așa că profităm de cele mai bune prețuri ✈️`,
    `💡 Hai să vedem de dimineață unde am putea zbura azi!`,
    `🔥 Ce dimineață! Iată câteva rute de care poți fi mândru 😉`,
  ];

  const evening = [
    `${weekdayStr}, seara? Moment perfect să vezi unde poți evada ✈️🔥`,
    `🌇 Bună seara! E timpul să te relaxezi și să verifici cele mai bune oferte ale zilei 😉`,
    `Ei bine… acest ${weekdayStr.toLowerCase()} se apropie de final — poate e momentul pentru o mică aventură?`,
    `✨ Zborurile de seară: oferte bune, atmosferă cozy și poftă de plecat undeva…`,
    `😎 În timp ce alții merg la culcare, noi alegem destinații. Uite selecția serii!`,
    `🌘 E ${weekdayStr.toLowerCase()} și chef-ul meu de călătorie e 100%. Dar al tău?`,
    `🔥 Seara e momentul deciziilor curajoase. Iată unde ai putea zbura dacă îndrăznești 😉`,
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
    } de la ${price * exchange}RON (${price}€)</b>\n`;
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
💶 aprox. <b>${price * exchange}</b> RON (${price}€)
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

module.exports = { preMessage, getFlightDigestTitle };

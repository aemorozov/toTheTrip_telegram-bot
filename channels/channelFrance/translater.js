const titles = [
  "💸 TOP vols aller-retour aux prix les plus bas depuis",
  "🏆 Meilleures offres de vols aller-retour depuis",
  "🔥 Meilleures offres sur les vols aller-retour depuis",
  "✈️ Vols aller-retour à prix avantageux depuis",
  "📉 Les tarifs aller-retour les plus bas en ce moment depuis",
  "🛫 Voyage malin — les meilleurs prix depuis",
  "💰 Offres imbattables sur les vols aller-retour depuis",
  "🌍 TOP offres de voyage aller-retour depuis",
  "🎯 Les destinations les moins chères depuis",
  "⭐ Les meilleures offres de vols aller-retour depuis",
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
  "#Billets",
  "#Vols",
  "#Voyages",
  "#Offres",
  "#France",
  "#Avion",
  "#Europe",
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

// ✈️ Функция для выбора случайных 7 хэштегов
function getRandomHashtags(count = 7) {
  const shuffled = [...hashtags].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).join(" ");
}

function getFlightDigestTitle() {
  const now = new Date();
  const hour = now.getHours();
  const weekdays = [
    "Lundi", // Понедельник
    "Mardi", // Вторник
    "Mercredi", // Среда
    "Jeudi", // Четверг
    "Vendredi", // Пятница
    "Samedi", // Суббота
    "Dimanche", // Воскресенье
  ];

  const weekdayStr = weekdays[now.getDay() - 1];

  const morning = [
    `On dirait que nous sommes ${weekdayStr.toLowerCase()} aujourd’hui ? Voici notre sélection matinale des meilleurs vols ✈️`,
    `🌅 Bonjour ! Voici ta sélection toute fraîche des bons plans du jour !`,
    `On démarre ce ${weekdayStr.toLowerCase()} avec des vols pas chers dès le matin !`,
    `☕️ Décollage matinal : c’est ${weekdayStr.toLowerCase()}, alors profitons des meilleurs prix ✈️`,
    `💡 Et si on regardait ce matin où l’on pourrait s’envoler ?`,
    `🔥 Quel début de journée ! Voici des itinéraires dont on peut être fier 😉`,
  ];

  const evening = [
    `${weekdayStr}, le soir ? Parfait pour découvrir où s’échapper ✈️🔥`,
    `🌇 Bonsoir ! Il est temps de se détendre et de regarder les meilleures offres du jour 😉`,
    `Alors, ce ${weekdayStr.toLowerCase()} touche à sa fin — peut-être le moment de s’offrir une petite aventure ?`,
    `✨ Vols du soir : bons plans, ambiance cosy et l’envie douce de partir quelque part…`,
    `😎 Pendant que certains vont dormir, nous choisissons des destinations. Voici la sélection du soir !`,
    `🌘 On est ${weekdayStr.toLowerCase()} et mon envie de voyager est à 100 %. Et toi ?`,
    `🔥 Le soir, c’est l’heure des décisions audacieuses. Voici où tu pourrais partir si tu oses 😉`,
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
      destinationName ? ` vers ${destinationName.toUpperCase()}` : ""
    } à partir de ${price}€</b>\n`;
  },

  directFlights() {
    return `\n<b>Vols directs :</b>\n`;
  },

  tramsferFlights() {
    return `\n<b>Vols avec escale :</b>\n`;
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
💶 env. <b>${price}€</b>
📅 <b>${depDate}  🕓 ${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}  🕓 ${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Lien : <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return `\n📢 Partage-le avec tes amis !\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>\n\n${randomHashtags}`;
  },
};

module.exports = { preMessage, getFlightDigestTitle };

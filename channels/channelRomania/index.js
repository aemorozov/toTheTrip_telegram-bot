const CHANNEL_ID = "@CheapFlightsRomania";
const axios = require("axios");
const FormData = require("form-data");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../encodeLink");
const { getCityName } = require("../../services/db");
const { getCityImage } = require("../getImages");
const { translateToRomanian } = require("./translater");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const airports = [
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "BUH",
  "CLJ",
  "CRA",
  "IAS",
  "OMR",
  "SBZ",
  "TSR",
];

// === Redis helper
async function redisRequest(method, key, value = null) {
  const url = `${UPSTASH_REDIS_REST_URL}/${method}/${encodeURIComponent(key)}${
    value ? `/${encodeURIComponent(value)}` : ""
  }`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });
  return res.json();
}

function getRandomOrigins(count = 1) {
  const copy = [...airports];
  const origins = [];
  while (origins.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    origins.push(copy.splice(idx, 1)[0]);
  }
  return origins;
}

async function postCheapFlights() {
  let flights = [];
  const maxOriginAttempts = 5;
  let originAttempts = 0;

  while (flights.length === 0 && originAttempts < maxOriginAttempts) {
    originAttempts++;
    const origins = getRandomOrigins(3);

    for (const origin of origins) {
      try {
        const { data } = await axios.get(
          "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
          {
            params: {
              currency: "eur",
              origin,
              unique: true,
              sorting: "price",
              direct: false,
              one_way: false,
              limit: 100,
              token: TRAVELPAYOUTS_TOKEN,
            },
          }
        );

        const allFlights = data?.data || [];
        const filteredFlights = allFlights.filter(
          (f) => f.transfers <= 2 && f.return_transfers <= 2
        );

        if (!filteredFlights.length) continue;

        const destinations = filteredFlights.map((f) => f.destination);
        let finalFlights = [];
        let destAttempts = 0;
        const maxDestAttempts = 5;

        while (finalFlights.length === 0 && destAttempts < maxDestAttempts) {
          destAttempts++;
          const destination =
            destinations[Math.floor(Math.random() * destinations.length)];

          const { data: finalResponse } = await axios.get(
            "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
            {
              params: {
                currency: "eur",
                origin,
                destination,
                unique: false,
                sorting: "price",
                direct: false,
                one_way: false,
                limit: 6,
                token: TRAVELPAYOUTS_TOKEN,
              },
            }
          );

          finalFlights = finalResponse?.data || [];
        }

        if (finalFlights.length) {
          flights.push(...finalFlights);
          break;
        }
      } catch (err) {
        console.warn(`Ошибка при запросе рейсов из ${origin}:`, err.message);
        continue;
      }
    }
  }

  if (!flights.length) {
    console.error(
      "⚠️ Не удалось найти ни одного рейса после нескольких попыток."
    );
    return;
  }

  const originName = await getCityName(flights[0].origin);
  const destinationName = await getCityName(flights[0].destination);

  const titles = [
    "✈️ Best round trip flights from",
    "👀 Look! Best round trip deals from",
    "🔥 WOW, it's really cheap! Round trip flights from",
    "⏰ Don't miss! Cheap round trip flights from",
    "💰 Hot prices alert! Cheap round trip flights from",
    "🛫 Fly round trip cheap from",
    "✨ Amazing round trip deals from",
    "🎯 Grab it now! Cheap round trip flights from",
    "🏷️ Unbeatable prices for round trip flights from",
    "⭐ Exclusive round trip offers from",
  ];

  const title = titles[Math.floor(Math.random() * titles.length)];

  let message = `<b>${title} ${originName.toUpperCase()} to ${destinationName.toUpperCase()} from ${
    flights[0].price
  }€</b>\n`;

  for (const flight of flights) {
    const dtDeparture = DateTime.fromISO(flight.departure_at, {
      setZone: true,
    });
    const dtReturn = DateTime.fromISO(flight.return_at, { setZone: true });

    const short = extractShortLink();
    const searchPath = `${flight.origin}${dtDeparture.toFormat("ddMM")}${
      flight.destination
    }${dtReturn.toFormat("ddMM")}1`;
    const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
    const encodedUrl = encodeURIComponent(baseUrl);
    const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

    message += `
💸 about <b>${flight.price}€</b>
🛫 <b>${dtDeparture.toFormat("dd.MM.yyyy")}</b>  🕐 <b>${dtDeparture.toFormat(
      "HH:mm"
    )}</b>
🛬 <b>${dtReturn.toFormat("dd.MM.yyyy")}</b>  🕐 <b>${dtReturn.toFormat(
      "HH:mm"
    )}</b>
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  }

  message += `\n📢 Share with friends!\n\n🤖 <b>Try our bot: <a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>`;

  // === получаем квадратное изображение
  const imageBuffer = await getCityImage(destinationName);

  if (!imageBuffer) {
    console.warn("⚠️ Не удалось получить изображение. Отправляю без фото.");
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: CHANNEL_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }
    );
    return;
  }

  const translateMessage = await translateToRomanian(message);

  // === отправляем фото с подписью через FormData
  const form = new FormData();
  form.append("chat_id", CHANNEL_ID);
  form.append("caption", translateMessage);
  form.append("parse_mode", "HTML");
  form.append("disable_web_page_preview", "true");
  form.append("photo", imageBuffer, `${destinationName}.jpg`);

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    form,
    {
      headers: form.getHeaders(),
    }
  );

  console.log(
    `✅ Flights from ${originName} to ${destinationName} posted to Telegram`
  );
}

// функция для постинга ТОП билетов
//////////////////////////////
async function postTOPFlights() {
  let flights = [];
  const maxOriginAttempts = 5;
  let originAttempts = 0;

  while (flights.length === 0 && originAttempts < maxOriginAttempts) {
    originAttempts++;
    const origins = getRandomOrigins(3);

    for (const origin of origins) {
      try {
        const { data } = await axios.get(
          "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
          {
            params: {
              currency: "eur",
              origin,
              unique: true,
              sorting: "price",
              direct: false,
              one_way: false,
              limit: 6,
              token: TRAVELPAYOUTS_TOKEN,
            },
          }
        );

        const allFlights = data?.data || [];
        const filteredFlights = allFlights.filter(
          (f) => f.transfers <= 2 && f.return_transfers <= 2
        );

        if (!filteredFlights.length) continue;

        if (filteredFlights.length) {
          flights.push(...filteredFlights);
          break;
        }
      } catch (err) {
        console.warn(`Ошибка при запросе рейсов из ${origin}:`, err.message);
        continue;
      }
    }
  }

  if (!flights.length) {
    console.error(
      "⚠️ Не удалось найти ни одного рейса после нескольких попыток."
    );
    return;
  }

  const originName = await getCityName(flights[0].origin);
  const destinationName = await getCityName(
    flights[Math.floor(Math.random() * flights.length)].destination
  );

  const titles = [
    "💸 TOP cheapest round trip flights from",
    "🏆 Best price round trip deals from",
    "🔥 Hottest round trip flight offers from",
    "✈️ Top budget-friendly round trip flights from",
    "📉 Lowest round trip fares right now from",
    "🛫 Fly smart — best prices from",
    "💰 Unmissable cheap round trip flights from",
    "🌍 TOP round trip travel deals from",
    "🎯 Cheapest destinations from",
    "⭐ Best of the best round trip deals from",
  ];

  const title = titles[Math.floor(Math.random() * titles.length)];

  let message = `<b>${title} ${originName.toUpperCase()} from ${
    flights[0].price
  }€</b>\n`;

  for (const flight of flights) {
    const dtDeparture = DateTime.fromISO(flight.departure_at, {
      setZone: true,
    });
    const dtReturn = DateTime.fromISO(flight.return_at, { setZone: true });

    const short = extractShortLink();
    const searchPath = `${flight.origin}${dtDeparture.toFormat("ddMM")}${
      flight.destination
    }${dtReturn.toFormat("ddMM")}1`;
    const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
    const encodedUrl = encodeURIComponent(baseUrl);
    const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

    const destinationName = await getCityName(flight.destination);

    message += `
💸 to <b>${destinationName}</b> about <b>${flight.price}€</b>
🛫 <b>${dtDeparture.toFormat("dd.MM.yyyy")}</b>  🕐 <b>${dtDeparture.toFormat(
      "HH:mm"
    )}</b>
🛬 <b>${dtReturn.toFormat("dd.MM.yyyy")}</b>  🕐 <b>${dtReturn.toFormat(
      "HH:mm"
    )}</b>
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  }

  message += `\n📢 Share with friends!\n\n🤖 <b>Try our bot: <a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>`;

  // === получаем квадратное изображение
  const imageBuffer = await getCityImage(destinationName);

  if (!imageBuffer) {
    console.warn("⚠️ Не удалось получить изображение. Отправляю без фото.");
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        chat_id: CHANNEL_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }
    );
    return;
  }

  const translateMessage = await translateToRomanian(message);

  const form = new FormData();
  form.append("chat_id", CHANNEL_ID);
  form.append("caption", translateMessage);
  form.append("parse_mode", "HTML");
  form.append("disable_web_page_preview", "true");
  form.append("photo", imageBuffer, `${destinationName}.jpg`);

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    form,
    {
      headers: form.getHeaders(),
    }
  );

  console.log(
    `✅ Flights from ${originName} to ${destinationName} posted to Telegram`
  );
}

module.exports = { postCheapFlights, postTOPFlights };

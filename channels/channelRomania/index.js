const axios = require("axios");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../encodeLink");
const { getCityName } = require("../../services/db");
const { getCityImage } = require("../getImages");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@cheapflightsforyou";
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const airports = ["BUH"];

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
  const origins = getRandomOrigins();
  let allFlights = [];
  let flights = [];

  for (const origin of origins) {
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

    allFlights.push(...data?.data);

    const filteredFlights = allFlights.filter(
      (f) => f.transfers <= 2 && f.return_transfers <= 2
    );

    const destinations = filteredFlights.map((f) => f.destination);
    console.log(destinations);

    // функция, которая делает попытку запроса и повторяет при пустом ответе
    async function tryDestination() {
      let attempts = 0;
      let finalFlights = [];

      while (finalFlights.length <= 1 && attempts < 5) {
        attempts++;

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
        console.log(
          `🔁 Попытка ${attempts}: ${destination} (${finalFlights.length} найдено)`
        );
      }
      return finalFlights;
    }

    const finalFlights = await tryDestination();
    flights.push(...finalFlights);
  }

  console.log(flights);

  // узнаем названия городов для сообщения
  const originName = await getCityName(flights[0].origin);
  const destinationName = await getCityName(flights[0].destination);

  // формируем сообщение
  let message = `🔥 <b>Best flights from ${originName.toUpperCase()} to ${destinationName.toUpperCase()} from ${
    flights[0].price
  }€</b>\n`;

  // проходим по каждому билеты и формируем предложения в сообщении
  for (const flight of flights) {
    // работаем со временем и датой
    const dtDeparture = DateTime.fromISO(flight.departure_at, {
      setZone: true,
    });
    const formattedDateDeparture = dtDeparture.toFormat("dd.MM.yyyy");
    const formattedTimeDeparture = dtDeparture.toFormat("HH:mm");
    const dtReturn = DateTime.fromISO(flight.return_at, { setZone: true });
    const formattedDateReturn = dtReturn.toFormat("dd.MM.yyyy");
    const formattedTimeReturn = dtReturn.toFormat("HH:mm");

    // формируем ссылку
    const short = extractShortLink();
    const searchPath = `${flight.origin}${DateTime.fromISO(
      flight.departure_at,
      {
        setZone: true,
      }
    ).toFormat("ddMM")}${flight.destination}${DateTime.fromISO(
      flight.return_at,
      {
        setZone: true,
      }
    ).toFormat("ddMM")}1`;
    const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
    const encodedUrl = encodeURIComponent(baseUrl);
    const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

    // добавляем предложение в сообщение
    message += `
💸 about <b>${flight.price}€</b>
🛫 <b>${formattedDateDeparture}</b>  🕐 <b>${formattedTimeDeparture}</b>
🛬 <b>${formattedDateReturn}</b>  🕐 <b>${formattedTimeReturn}</b>
🔗 Link: <a href="${link}"><b>https://${short}</b></a>\n`;
  }

  message += `\n📢 Share with friends!\n\n🤖 <b>Try our bot: <a href="https://t.me/CheapFlightsToTheTripBot">Cheap Flights Bot</a></b>`;

  // получаем картинку
  const imageUrl = await getCityImage(destinationName);

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    chat_id: CHANNEL_ID,
    photo: imageUrl,
    caption: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });

  console.log("✅ Flights posted to Telegram");
}

module.exports = { postCheapFlights };

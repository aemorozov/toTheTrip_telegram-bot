const axios = require("axios");
const FormData = require("form-data");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../encodeLink");
const { getCityName } = require("../../services/db");
const { getCityImage } = require("../getImages");
const { preMessage } = require("./translater");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania";
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;

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

function getRandomOrigins(count = 1) {
  const copy = [...airports];
  const origins = [];
  while (origins.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length);
    origins.push(copy.splice(idx, 1)[0]);
  }
  return origins;
}

// helper: извлекает дату в формате "YYYY-MM-DD" из link (search_date=DDMMYYYY)
function extractSearchDateISO(link) {
  const m = link && link.match(/search_date=(\d{8})/);
  if (!m) return null;
  const s = m[1]; // DDMMYYYY
  return `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`; // YYYY-MM-DD
}

const todayISO = new Date().toISOString().slice(0, 10);
const yesterdayISO = new Date(Date.now() - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

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
        let prefinalFlights = [];
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
                limit: 15,
                token: TRAVELPAYOUTS_TOKEN,
              },
            }
          );

          // все пришедшие предложения
          prefinalFlights = finalResponse?.data || [];

          // фильтруем только по свежей search_date (сегодня или вчера)
          finalFlights = prefinalFlights.filter((f) => {
            const sd = extractSearchDateISO(f.link);
            return sd === todayISO || sd === yesterdayISO;
          });

          console.log("finalFlights:", finalFlights);
        }

        if (finalFlights.length) {
          const limitedFlights = finalFlights.slice(0, 7);
          flights.push(...limitedFlights);
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

  let message = preMessage.header({
    origin: originName.toUpperCase(),
    price: flights[0].price,
    destinationName: destinationName,
  });

  for (const flight of flights) {
    const dtDeparture = DateTime.fromISO(flight.departure_at, {
      setZone: true,
    });
    const dtReturn = DateTime.fromISO(flight.return_at, { setZone: true });

    const depDate = dtDeparture.setLocale("en").toFormat("dd LLL yyyy");
    const depTime = dtDeparture.toFormat("HH:mm");
    const depTransfers = flight.transfers;
    const retDate = dtReturn.setLocale("en").toFormat("dd LLL yyyy");
    const retTime = dtReturn.toFormat("HH:mm");
    const retTransfers = flight.return_transfers;

    const short = extractShortLink();
    const searchPath = `${flight.origin}${dtDeparture.toFormat("ddMM")}${
      flight.destination
    }${dtReturn.toFormat("ddMM")}1`;
    const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
    const encodedUrl = encodeURIComponent(baseUrl);
    const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

    message += preMessage.flightItem({
      price: flight.price,
      depDate,
      depTime,
      depTransfers,
      retDate,
      retTime,
      retTransfers,
      link,
      short,
    });
  }

  message += preMessage.footer();

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

  // === отправляем фото с подписью через FormData
  const form = new FormData();
  form.append("chat_id", CHANNEL_ID);
  form.append("caption", message);
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
              limit: 20,
              token: TRAVELPAYOUTS_TOKEN,
            },
          }
        );

        const allFlights = data?.data || [];

        console.log("allFlights: ", allFlights);
        const filteredFlights = allFlights.filter((f) => {
          const sd = extractSearchDateISO(f.link);
          return (
            (sd === todayISO || sd === yesterdayISO) &&
            f.transfers <= 2 &&
            f.return_transfers <= 2
          );
        });

        console.log("filteredFlights: ", filteredFlights);

        if (!filteredFlights.length) continue;

        if (filteredFlights.length) {
          const limitedFlights = filteredFlights.slice(0, 7);
          flights.push(...limitedFlights);
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

  let message = preMessage.header({
    origin: originName.toUpperCase(),
    price: flights[0].price,
  });

  for (const flight of flights) {
    const dtDeparture = DateTime.fromISO(flight.departure_at, {
      setZone: true,
    });
    const dtReturn = DateTime.fromISO(flight.return_at, { setZone: true });

    const depDate = dtDeparture.setLocale("en").toFormat("dd LLL yyyy");
    const depTime = dtDeparture.toFormat("HH:mm");
    const depTransfers = flight.transfers;
    const retDate = dtReturn.setLocale("en").toFormat("dd LLL yyyy");
    const retTime = dtReturn.toFormat("HH:mm");
    const retTransfers = flight.return_transfers;

    const short = extractShortLink();
    const searchPath = `${flight.origin}${dtDeparture.toFormat("ddMM")}${
      flight.destination
    }${dtReturn.toFormat("ddMM")}1`;
    const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
    const encodedUrl = encodeURIComponent(baseUrl);
    const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

    const destinationName = await getCityName(flight.destination);

    message += preMessage.flightItem({
      destinationName,
      price: flight.price,
      depDate,
      depTime,
      depTransfers,
      retDate,
      retTime,
      retTransfers,
      link,
      short,
    });
  }

  message += preMessage.footer();

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

  const form = new FormData();
  form.append("chat_id", CHANNEL_ID);
  form.append("caption", message);
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

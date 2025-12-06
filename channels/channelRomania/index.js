const axios = require("axios");
const FormData = require("form-data");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../../bot/encodeLink");
const { getCityName } = require("./getCityName");
const { getCityImage } = require("../getCityImage");
const { preMessage } = require("./translater");
const { wasPosted, addPosted } = require("../../bot/db");
const { haversineDistance } = require("../haversineDistance");
const { extractSearchDateISO } = require("../extractSearchDateISO");
const { shuffle } = require("../shuffle");
const { getFlightUID } = require("../getFlightUID");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania";
// const CHANNEL_ID = "@cheapflightsforyou";
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;

const airports = ["BUH", "CLJ", "CRA", "IAS", "OMR", "SBZ", "TSR"];

// Рейтинг система
function rateFlight(f) {
  const price = f.price;
  const dist = f.distance;
  const transfers = Math.max(f.transfers, f.return_transfers);

  // === 1. Супер дешёвые и без пресадок — всегда да
  if (price < 100) {
    return transfers === 0;
  }

  // === 2. До 2000 км — принимаем ТОЛЬКО прямые
  if (dist < 2000) {
    return transfers === 0 && price <= 150;
  }

  // === 2. До 3500 км — принимаем ТОЛЬКО прямые
  if (dist < 3500) {
    return transfers === 0 && price <= 250;
  }

  // === 3. 3500–5000 км — 1 пересадка допускается, но должны быть причины:
  if (dist < 5000) {
    if (transfers === 0 && price <= 400) return true;
    if (transfers === 1 && price <= 300) return true; // пересадка только если дешёвый
    return false;
  }

  // === 4. От 5000 км и выше — пересадки нормальны
  // но цена должна соответствовать дальности
  if (dist >= 5000) {
    if (transfers <= 1 && price <= 900) return true;
    if (transfers <= 2 && price <= 600) return true;
    return false;
  }

  return false;
}

// Сегодняшний день
const todayISO = new Date().toISOString().slice(0, 10);
// Вчера
const yesterdayISO = new Date(Date.now() - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
// Позавчера
const dayBeforeYesterdayISO = new Date(Date.now() - 24 * 60 * 60 * 1000 * 2)
  .toISOString()
  .slice(0, 10);

async function TopForToday() {
  let flights = [];

  console.log(`\n=== 🔎 TOP FOR TODAY FROM ALL ORIGINS ===`);

  // Делаем запросы по всем городам, определяем расстояния, опередляем интересные рейсы и формируем конечный массив для сообщения
  try {
    for (const origin of airports) {
      console.log(`\n📍 Fetching flights from ${origin}...`);

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
            limit: 500,
            token: TRAVELPAYOUTS_TOKEN,
          },
        }
      );

      const allFlights = data?.data || [];
      console.log(`  ➜ Received: ${allFlights.length}`);

      const filteredFlights = allFlights.filter((f) => {
        const sd = extractSearchDateISO(f.link);
        return (
          (sd === todayISO || sd === yesterdayISO) &&
          f.transfers <= 2 &&
          f.return_transfers <= 2
        );
      });

      console.log(`  ➜ Filtered today-only: ${filteredFlights.length}`);

      flights.push(...filteredFlights);
    }

    console.log(
      `\n📦 TOTAL FLIGHTS COLLECTED FROM ALL ORIGINS: ${flights.length}`
    );

    if (flights.length === 0) {
      console.log("⚠️ No flights found for today");
      return;
    }

    // === enrich flights (city names + geo + distance)
    for (const flight of flights) {
      const [originName, originLon, originLat, originCountry] =
        await getCityName(flight.origin);
      const [destinationName, destLon, destLat, destinationCountry] =
        await getCityName(flight.destination);

      flight.originName = originName;
      flight.originLon = originLon;
      flight.originLat = originLat;
      flight.originCountry = originCountry;

      flight.destinationName = destinationName;
      flight.destinationLon = destLon;
      flight.destinationLat = destLat;
      flight.destinationCountry = destinationCountry;

      flight.distance = haversineDistance(
        originLon,
        originLat,
        destLon,
        destLat
      );
    }

    // === filtering good flights
    const rated = flights.filter(rateFlight);

    // === shuffle and sort // no
    flights = shuffle(rated);
  } catch (err) {
    console.warn(`❌ Error while retrieving flights:`, err.message);
    return;
  }

  // ===============================================================
  //   👉 3. Удаляем рейсы, которые были до этого постинга
  // ===============================================================
  const freshFlights = [];
  for (const flight of flights) {
    const uid = getFlightUID(flight);

    if (!(await wasPosted(uid))) {
      flight.uid = uid;
      freshFlights.push(flight);
    }
  }

  if (!freshFlights.length) {
    console.warn("✨ All interesting flights already posted today");
    return;
  }

  for (const flight of freshFlights) {
    await addPosted(flight.uid, {
      price: flight.price,
      origin: flight.originName,
      destination: flight.destinationName,
      distance: flight.distance,
    });
    // console.log(`💾 Stored UID: ${flight.uid}`);
  }

  let count = 0;

  const title = getFlightDigestTitle();
  const randomNumber = Math.random() < 0.5 ? 3 : 4;
  const message =
    `<b>${title}</b>\n` +
    freshFlights
      .map((flight) => {
        count++;
        if (count > randomNumber) return;
        const dtDeparture = DateTime.fromISO(flight.departure_at, {
          setZone: true,
        });
        const dtReturn = DateTime.fromISO(flight.return_at, {
          setZone: true,
        });

        const depDate = dtDeparture.setLocale("en").toFormat("dd LLL yyyy");
        const depTime = dtDeparture.toFormat("HH:mm");
        const retDate = dtReturn.setLocale("en").toFormat("dd LLL yyyy");
        const retTime = dtReturn.toFormat("HH:mm");

        const short = extractShortLink();
        const searchPath = `${flight.origin}${dtDeparture.toFormat("ddMM")}${
          flight.destination
        }${dtReturn.toFormat("ddMM")}1`;
        const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
        const encodedUrl = encodeURIComponent(baseUrl);

        const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

        const originName = flight.originName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const destinationName = flight.destinationName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        return preMessage.flightItem({
          originName,
          destinationName,
          price: flight.price,
          depDate,
          depTime,
          depTransfers: flight.transfers,
          retDate,
          retTime,
          retTransfers: flight.return_transfers,
          link,
          short,
        });
      })
      .join("") +
    preMessage.footer();

  // ===============================================================
  //         👉 7. Получаем фото
  // ===============================================================
  // console.log(
  //   "📸 Choosing image for:",
  //   freshFlights[0].destinationName,
  //   freshFlights[0].destinationCountry
  // );
  const imgBuffer = await getCityImage(
    freshFlights[0].destinationName,
    freshFlights[0].destinationCountry
  );

  // ===============================================================
  //         👉 8. Отправляем
  // ===============================================================

  if (!imgBuffer) {
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
  form.append("photo", imgBuffer, "image.jpg");

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    form,
    {
      headers: form.getHeaders(),
    }
  );
  console.log(`\n✅ Posted`);
}

module.exports = { TopForToday, rateFlight };

const axios = require("axios");
const FormData = require("form-data");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../../bot/encodeLink");
const { getCityName } = require("./getCityName");
const { getCityImage } = require("../getCityImage");
const { preMessage, getGPTTitle } = require("./translater");
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

  // Проверяем билет
  console.log(
    `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
  );

  if (price < 50) {
    if (transfers === 0) {
      console.log(`TRUE, price < 50`);
      return true;
    }
    console.log(`FALSE`);
    return false;
  }

  if (dist < 2000) {
    if (transfers === 0 && price <= 70) {
      console.log(`TRUE, price < 70, dist < 2000`);
      return true;
    }
    console.log(`FALSE`);
    return false;
  }

  if (dist < 3500) {
    if (transfers === 0 && price <= 150) {
      console.log(`TRUE, price < 150, dist < 3500`);
      return true;
    }
    console.log(`FALSE`);
    return false;
  }

  if (dist < 5000) {
    if (transfers === 0 && price <= 350) {
      console.log(`TRUE, price < 350, dist < 5000`);
      return true;
    } // было 400 → 350
    if (transfers === 1 && price <= 200) {
      console.log(`TRUE, price < 200, dist < 5000`);
      return true;
    } // было 300 → 220
    console.log(`FALSE`);
    return false;
  }

  if (dist < 8000) {
    if (transfers === 0 && price <= 400) {
      console.log(`TRUE, price < 400, dist < 8000`);
      return true;
    }
    if (transfers === 1 && price <= 250) {
      console.log(`TRUE, price < 250, dist < 8000`);
      return true;
    } // было 500 → 350
    console.log(`FALSE`);
    return false;
  }

  if (dist < 10000) {
    if (price <= 450 && transfers <= 1) {
      console.log(`TRUE, price < 450, dist < 10000`);
      return true;
    } // супер-финды!
    console.log(`FALSE`);
    return false;
  }

  if (dist >= 10000) {
    if (price <= 700 && transfers <= 2) {
      console.log(`TRUE, price < 700, dist >= 10000`);
      return true;
    } // супер-финды!
    console.log(`FALSE`);
    return false;
  }

  console.log(`FALSE`);

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

  // Делаем запросы по всем городам за вчера и сегодня с максимум 1 пересадкой, всё складываем во flights
  try {
    for (const origin of airports) {
      // console.log(`\n📍 Fetching flights from ${origin}...`);

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
      console.log(`  ➜ Received from ${origin}: ${allFlights.length}`);

      const filteredFlights = allFlights.filter((f) => {
        const sd = extractSearchDateISO(f.link);
        return (
          (sd === todayISO || sd === yesterdayISO) &&
          f.transfers <= 2 &&
          f.return_transfers <= 2
        );
      });

      console.log(
        `  ➜ Filtered today-only from ${origin}: ${filteredFlights.length}`
      );

      flights.push(...filteredFlights);
    }

    console.log(
      `\n📦 TOTAL FLIGHTS COLLECTED FROM ALL ORIGINS: ${flights.length}`
    );

    if (flights.length === 0) {
      console.log("⚠️ No flights found for today");
      return;
    }

    // === добавляем city names + geo + distance
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
    flights = flights.filter(rateFlight);
    console.log("filter flights:", flights.length);

    // === shuffle перемешиваем, сортируем
    // flights = flights.sort((a, b) => a.price - b.price);
  } catch (err) {
    console.warn(`❌ Error while retrieving flights:`, err.message);
    return;
  }

  // ===============================================================
  //   👉 3. Удаляем рейсы, которые были до этого постинга
  // ===============================================================
  const preFreshFlights = [];
  for (const flight of flights) {
    flight.uid = getFlightUID(flight);

    if (!(await wasPosted(flight.uid))) {
      preFreshFlights.push(flight);
    }
  }

  const freshFlights = shuffle(preFreshFlights)
    .slice(0, 5)
    .sort((a, b) => a.price - b.price);

  console.log("freshFlights:", freshFlights.length);

  if (!freshFlights.length) {
    console.warn("✨ All interesting flights already posted today");
    return;
  }

  const ticketsForGPT = freshFlights.map((f) => ({
    from: f.originName,
    to: f.destinationName,
    price: f.price,
    currency: "EUR",
    transfers: f.transfers,
    return_transfers: f.return_transfers,
    distance: Math.round(f.distance),
  }));

  // Формируем сообщение
  const title = await getGPTTitle(JSON.stringify(ticketsForGPT));
  const message =
    `<b>${title}</b>\n` +
    freshFlights
      .map((flight) => {
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

  // Добавляем все flights из freshFlights в базу данных
  for (const flight of freshFlights) {
    await addPosted(flight.uid);
    console.log(`💾 Saved with UID: ${flight.uid}`);
  }
  console.log(`\n✅ Posted`);
}

module.exports = { TopForToday };

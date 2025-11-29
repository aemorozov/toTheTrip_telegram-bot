const axios = require("axios");
const FormData = require("form-data");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../../services/encodeLink");
const { getCityName } = require("./getCityName");
const { getCityImage } = require("../../services/getCityImage");
const { preMessage } = require("./translater");
const { wasPosted, addPosted } = require("../../services/db");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania";
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
    if (transfers <= 1 && price <= 800) return true;
    if (transfers <= 2 && price <= 800) return true;
    return false;
  }

  return false;
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

// Формула рассчёта расстояния между городами
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Радиус Земли в километрах

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// helper: извлекает дату в формате "YYYY-MM-DD" из link (search_date=DDMMYYYY)
function extractSearchDateISO(link) {
  const m = link && link.match(/search_date=(\d{8})/);
  if (!m) return null;
  const s = m[1]; // DDMMYYYY
  return `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`; // YYYY-MM-DD
}

// 🌀 Перемешиваем массив (Fisher–Yates shuffle)
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Присваиваем уникальный ID для записи в БД
function getFlightUID(f) {
  const dep =
    f.departure_at.slice(0, 10).replace(/-/g, "").slice(6, 10) +
    f.departure_at.slice(5, 7);
  const ret =
    f.return_at.slice(0, 10).replace(/-/g, "").slice(6, 10) +
    f.return_at.slice(5, 7);

  return `${f.originName}-${f.destinationName}-${dep}-${ret}-${f.price}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // убираем диакритику
    .replace(/\s+/g, ""); // убираем пробелы
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

async function TopForTodayRomania() {
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
        return sd === todayISO && f.transfers <= 2 && f.return_transfers <= 2;
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

    // === shuffle and sort
    flights = shuffle(rated).sort((a, b) => a.price - b.price);
  } catch (err) {
    console.warn(`❌ Error while retrieving flights:`, err.message);
    return;
  }

  // ===============================================================
  //         👉 3. Удаляем рейсы, которые мы уже постили
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

  // ===============================================================
  //         👉 4. Выбираем случайный рейс
  // ===============================================================
  const randomFlight =
    freshFlights[Math.floor(Math.random() * freshFlights.length)];

  // ===============================================================
  //         👉 5. Добавляем его в список postedFlights
  // ===============================================================
  await addPosted(randomFlight.uid);
  console.log(`💾 Stored UID: ${randomFlight.uid}`);

  // ===============================================================
  //         👉 6. Формируем сообщение только для 1 рейса
  // ===============================================================

  const dtDeparture = DateTime.fromISO(randomFlight.departure_at, {
    setZone: true,
  });
  const dtReturn = DateTime.fromISO(randomFlight.return_at, { setZone: true });

  const depDate = dtDeparture.setLocale("en").toFormat("dd LLL yyyy");
  const depTime = dtDeparture.toFormat("HH:mm");
  const retDate = dtReturn.setLocale("en").toFormat("dd LLL yyyy");
  const retTime = dtReturn.toFormat("HH:mm");

  const short = extractShortLink();
  const searchPath = `${randomFlight.origin}${dtDeparture.toFormat("ddMM")}${
    randomFlight.destination
  }${dtReturn.toFormat("ddMM")}1`;
  const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
  const encodedUrl = encodeURIComponent(baseUrl);

  const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

  const originName = randomFlight.originName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const destinationName = randomFlight.destinationName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const message =
    preMessage.flightItem({
      originName,
      destinationName,
      price: randomFlight.price,
      depDate,
      depTime,
      depTransfers: randomFlight.transfers,
      retDate,
      retTime,
      retTransfers: randomFlight.return_transfers,
      link,
      short,
    }) + preMessage.footer();

  // ===============================================================
  //         👉 7. Получаем фото
  // ===============================================================
  console.log(
    "📸 Choosing image for:",
    destinationName,
    randomFlight.destinationCountry
  );
  const imgBuffer = await getCityImage(
    destinationName,
    randomFlight.destinationCountry
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
  console.log(`\n✅ Posted: ${randomFlight.uid}`);
}

module.exports = { TopForTodayRomania };

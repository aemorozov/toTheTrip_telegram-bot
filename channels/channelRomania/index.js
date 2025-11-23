const axios = require("axios");
const FormData = require("form-data");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../encodeLink");
const { getCityName } = require("../getCityName");
const { getCityImage } = require("../getImages");
const { preMessage } = require("./translater");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHANNEL_ID = "@CheapFlightsRomania";
const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;

const airports = ["BUH", "CLJ", "CRA", "IAS", "OMR", "SBZ", "TSR"];

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

// Рейтинг система
function rateFlight(f) {
  const price = f.price;
  const dist = f.distance;
  const transfers = Math.max(f.transfers, f.return_transfers);

  // === 1. Супер дешёвые — всегда да
  if (price < 100) return true;

  // === 2. До 3000 км — принимаем ТОЛЬКО прямые
  if (dist < 3000) {
    return transfers === 0 && price <= 250;
  }

  // === 3. 3000–4500 км — 1 пересадка допускается, но должны быть причины:
  if (dist < 4500) {
    if (transfers === 0 && price <= 400) return true;
    if (transfers === 1 && price <= 300) return true; // пересадка только если дешёвый
    return false;
  }

  // === 4. От 4500 км и выше — пересадки нормальны
  // но цена должна соответствовать дальности
  if (dist >= 4500) {
    if (transfers <= 1 && price <= 600) return true;
    if (transfers <= 2 && price <= 800) return true;
    return false;
  }

  return false;
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
  const origins = ["BUH", "CLJ", "CRA", "IAS", "OMR", "SBZ", "TSR"];

  const todayISO = new Date().toISOString().slice(0, 10);

  let flights = [];
  let message = "";

  console.log(`\n=== 🔎 TOP-5 FOR TODAY FROM ALL ORIGINS ===`);

  // Делаем запросы по всем городам, определяем расстояния, опередляем интересные рейсы и формируем конечный массив для сообщения
  try {
    for (const origin of origins) {
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

      // добавляем к общему массиву
      flights.push(...filteredFlights);
    }

    console.log(
      `\n📦 TOTAL FLIGHTS COLLECTED FROM ALL ORIGINS: ${flights.length}`
    );

    console.log("flights: ", flights);

    if (flights.length === 0) {
      console.log("⚠️ No flights found for today");
      return [];
    }

    // Определяем координаты и расстояние
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

    console.log(flights);

    // 1. Фильтруем крутые перелёты
    const rated = flights.filter(rateFlight);

    // 2. Выбираем рандомные и берём топ
    flights = shuffle(rated)
      .slice(0, 6)
      .sort((a, b) => a.price - b.price);
  } catch (err) {
    console.warn(`❌ Error while retrieving flights:`, err.message);
    return [];
  }

  // === Формирование сообщения
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

    const originName = flight.originName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // убираем диакритику
    const destinationName = flight.destinationName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // убираем диакритику

    message += preMessage.flightItem({
      originName,
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

  // === Выбираем случайный город из списка рейсов для фото (нет, первый) ===
  const randomFlight = flights[0];
  const city = randomFlight.destinationName;
  const country = randomFlight.destinationCountry;

  console.log("📸 Choosing image for:", city);

  // === Получаем фото для этого города ===
  const imgBuffer = await getCityImage(city, country);

  if (!imgBuffer) {
    console.warn(`⚠️ No image for ${city}, sending text only.`);

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

  // === Отправляем фотографию с текстом ===
  const form = new FormData();
  form.append("chat_id", CHANNEL_ID);
  form.append("caption", message);
  form.append("parse_mode", "HTML");
  form.append("photo", imgBuffer, `${city}.jpg`);

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    form,
    { headers: form.getHeaders() }
  );

  console.log(`\n✅ Flights posted to Telegram`);
}

async function postCheapFlights() {
  let flights = [];
  let directFlights = [];
  let transfersFlights = [];
  const maxOriginAttempts = 5;
  let originAttempts = 0;
  let price = "";

  while (flights.length === 0 && originAttempts < maxOriginAttempts) {
    originAttempts++;
    const origins = getRandomOrigins(1);
    // получаем все возможные направления для нашего ориджин, только что бы собрать пул из направлений
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
          (f) => f.transfers <= 1 && f.return_transfers <= 1
        );

        if (!filteredFlights.length) continue;

        const destinations = filteredFlights.map((f) => f.destination);
        let finalFlights = [];
        let destAttempts = 0;
        const maxDestAttempts = 10;

        // выбираем рандомное направление и ищем по нему все дешевые билеты
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

          // фильтруем только по свежей search_date (сегодня или вчера) и по пересадкам
          finalFlights = finalResponse?.data.filter((f) => {
            const sd = extractSearchDateISO(f.link);
            return (
              (sd === todayISO ||
                sd === yesterdayISO ||
                sd === dayBeforeYesterdayISO) &&
              f.transfers <= 1 &&
              f.return_transfers <= 1
            );
          });
        }

        if (finalFlights.length > 1) {
          directFlights = finalFlights.filter(
            (f) => f.transfers == 0 && f.return_transfers == 0
          );

          directFlights = directFlights.slice(0, 5);

          transfersFlights = finalFlights.filter(
            (f) => f.transfers > 0 || f.return_transfers > 0
          );

          transfersFlights = transfersFlights.slice(0, 2);

          const combined = [...directFlights, ...transfersFlights];

          price = Math.min(...combined.map((f) => f.price));

          if (directFlights.length > 0 || transfersFlights.length > 0) {
            continue;
          } else {
            break;
          }
        }
      } catch (err) {
        console.warn(`Ошибка при запросе рейсов из ${origin}:`, err.message);
        continue;
      }
    }
  }

  const originName =
    (await getCityName(directFlights[0].origin)) ||
    (await getCityName(transfersFlights[0].origin));
  const destinationName =
    (await getCityName(directFlights[0].destination)) ||
    (await getCityName(transfersFlights[0].destination));

  let message = preMessage.header({
    origin: originName.toUpperCase(),
    price: price,
    destinationName: destinationName,
  });

  directFlights.length > 0 ? (message += preMessage.directFlights()) : "";

  for (const flight of directFlights) {
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

  transfersFlights.length > 0 ? (message += preMessage.tramsferFlights()) : "";

  for (const flight of transfersFlights) {
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
  form.append("photo", imageBuffer, "image.jpg");

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    form,
    {
      headers: form.getHeaders(),
    }
  );

  console.log(`✅ Flights posted to Telegram`);
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

module.exports = { postCheapFlights, postTOPFlights, TopForToday };

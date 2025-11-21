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

// Рейтинг система
function rateFlight(f) {
  let score = 0;

  const price = f.price;
  const transfers = f.transfers;
  const returnTransfers = f.return_transfers;

  const durationTo = f.duration_to;
  const durationBack = f.duration_back;
  const avgDuration = (durationTo + durationBack) / 2;

  const dep = new Date(f.departure_at);
  const ret = new Date(f.return_at);
  const tripDays = (ret - dep) / (1000 * 60 * 60 * 24);

  const origin = f.origin;
  const dest = f.destination;

  // ============================================================
  // 0. Жёсткое обнуление: если билет точно НЕ интересный → score = -9999
  // ============================================================

  // ❌ Короткие направления + пересадки
  if (avgDuration < 240 && (transfers > 0 || returnTransfers > 0)) {
    return -9999;
  }

  // ❌ Короткие поездки 1–3 дня + любые пересадки
  if (tripDays < 4 && (transfers > 0 || returnTransfers > 0)) {
    return -9999;
  }

  // ❌ Короткие направления + высокая цена
  if (avgDuration < 240 && price > 150) {
    return -9999;
  }

  // ❌ Слишком далёкие ненужные маршруты без крутизны
  if (transfers >= 2 && price > 300 && avgDuration < 400) {
    return -9999;
  }

  // ============================================================
  // 1. Цена (минимальный вес)
  // ============================================================
  if (price < 50) score += 80;
  else if (price < 100) score += 40;
  else if (price < 200) score += 10;
  else score -= (price - 200) * 0.2;

  // ============================================================
  // 2. Пересадки
  // ============================================================
  if (transfers === 0) score += 40;
  if (returnTransfers === 0) score += 40;

  if (transfers === 1) score -= 20;
  if (returnTransfers === 1) score -= 20;

  if (transfers >= 2 || returnTransfers >= 2) score -= 120;

  // ============================================================
  // 3. Дальность (avgDuration)
  // ============================================================
  if (avgDuration < 180) score += 5; // короткие
  else if (avgDuration < 300) score += 25; // средние → оптимально для Европы
  else if (avgDuration < 450) score += 60; // дальние, но не супердальние
  else if (avgDuration < 680) score += 120; // дальняк = интересно
  else score += 160; // сверхдальняк = топ

  // ============================================================
  // 4. Вылет не из Бухареста
  // ============================================================
  if (origin !== "BUH") score += 40;

  // ============================================================
  // 5. Направления: скучные vs интересные
  // ============================================================

  const BORING_EU = ["SOF", "VAR", "ATH", "IST", "RMO", "BRI", "VLC", "NCE"];
  const LOWCOST_HUBS = ["BGY", "MXP", "FCO", "CIA", "BUD", "VIE", "WAW"];

  const COOL_MID = ["BER", "BCN", "PAR", "MAD", "AMS", "DUB", "LIS"];
  const EXOTIC = ["MLE", "PUJ", "MRU", "SEZ", "CUN", "DOH", "DXB", "ZNZ"];
  const RUSSIA = ["LED", "AER", "VKO", "SVO", "DME", "ASF", "KZN"];

  if (BORING_EU.includes(dest)) score -= 60;
  if (LOWCOST_HUBS.includes(dest) && price > 80) score -= 80;

  if (COOL_MID.includes(dest)) score += 70;
  if (EXOTIC.includes(dest)) score += 160;
  if (RUSSIA.includes(dest)) {
    if (transfers <= 1) score += 140;
    else score += 80;
  }

  // ============================================================
  // 6. Длительность поездки
  // ============================================================
  if (tripDays >= 5 && tripDays <= 10) score += 40;
  if (tripDays > 14) score -= 20; // слишком длинные → редко кликают

  // ============================================================
  // 7. Рандом для разнообразия
  // ============================================================
  score += Math.random() * 20;

  return score;
}

// helper: извлекает дату в формате "YYYY-MM-DD" из link (search_date=DDMMYYYY)
function extractSearchDateISO(link) {
  const m = link && link.match(/search_date=(\d{8})/);
  if (!m) return null;
  const s = m[1]; // DDMMYYYY
  return `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`; // YYYY-MM-DD
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
  let oneOfTheDestination = "";

  console.log(`\n=== 🔎 TOP-5 FOR TODAY FROM ALL ORIGINS ===`);

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

    // 1. Ставим рейтинг
    const rated = flights
      .map((f) => ({ ...f, score: rateFlight(f) }))
      .sort((a, b) => b.score - a.score);

    const ramdom3to6 = 3 + Math.floor(Math.random() * 4);

    // 2. Берём топ
    flights = rated.slice(0, ramdom3to6).sort((a, b) => a.price - b.price);

    console.log("\n🎯 FINAL SELECTED FLIGHTS:");
    flights.forEach((f, i) => {
      console.log(
        `${i + 1}.`,
        f.origin,
        "→",
        f.destination,
        f.price,
        "score:",
        f.score
      );
    });
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

    const originName = await getCityName(flight.origin);
    const destinationName = await getCityName(flight.destination);
    flight.destinationName = destinationName;

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

  oneOfTheDestination = flights[0].destinationName;

  const imageBuffer = await getCityImage(oneOfTheDestination);

  if (!imageBuffer) {
    console.warn("⚠️ No image, sending text only.");
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

  // === отправляем фото с подписью
  const form = new FormData();
  form.append("chat_id", CHANNEL_ID);
  form.append("caption", message);
  form.append("parse_mode", "HTML");
  form.append("disable_web_page_preview", "true");
  form.append("photo", imageBuffer, `img.jpg`);

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    form,
    {
      headers: form.getHeaders(),
    }
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

const axios = require("axios");
const FormData = require("form-data");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../bot/encodeLink");
const { getCityName } = require("./getCityName");
const { getCityImage } = require("./getCityImage");
const { wasPosted, addPosted } = require("../bot/db");
const { haversineDistance } = require("./haversineDistance");
const { shuffle } = require("./shuffle");
const { getFlightUID } = require("./getFlightUID");
import { Redis } from "@upstash/redis";
import OpenAI from "openai";
import { filterWeekendTrips } from "../../bot_0.2.9/weekendFlights";
let redis = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "⚠️ Upstash env vars missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
    );
  } else {
    redis = new Redis({ url, token });
  }
} catch (err) {
  console.error("❌ Error initializing Upstash Redis client:", err);
  redis = null;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getLastTitles(redis, REDIS_KEY) {
  return await redis.lrange(REDIS_KEY, 0, 9);
}

async function saveTitle(redis, title, REDIS_KEY) {
  await redis.lpush(REDIS_KEY, title);
  await redis.ltrim(REDIS_KEY, 0, 9);
}

async function getGPTTitle(tickets, REDIS_KEY, language = "en") {
  const samples = [
    "Думаем, чем займемся в январе:",
    "Жители Бухареста окажутся у моря уже завтра",
    "Мини-сборки для наших любимых путешественников:",
    "Еще горячая подборка:",
    "Горячий пирожок для Петербурга",
    "Туда, где тепло: 6 ночей в ОАЭ из Екатеринбурга за 24400 рублей с человека!",
    "А для самых быстрых есть дешёвые тикеты в Египет:",
    "Праздник к нам приходит:",
    "Давно мы уже такого не видели: прямые рейсы из Краснодара в Грузию",
    "Держим путь в Питер: прямые рейсы из Екб",
    "Кто там просил недорогие билеты в Америку?",
    "Дед Мороз заезжал в наш офис в Новосибирске и просил передать подарок для хороших мальчиков и девочек:",
    "Все дороги ведут в Египет:",
    "Летим смотреть предновогоднюю Турцию:",
    "Сибиряки, тут раздают дешёвые билеты:",
    "Пермяки, встречаем Новый год на берегу Красного моря:",
    "Едем на Кавказ: прямые декабрьские рейсы из Бухареста,",
    "Вот она, настоящая халява:",
    "Давненько мы уже не писали про билеты из Москвы на Филиппины!",
  ];

  const lastTitles = await getLastTitles(redis, REDIS_KEY);

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content: `You are a professional travel copywriter for Telegram channels.`,
      },
      {
        role: "user",
        content: `Rules:
- Generate SHORT, emotional, unusual ONE headline about all flights ${tickets}
- Strong about 100 characters in that headline, not more.
- Sound natural and human
- Use emoji (1-2) in start of title
- DO NOT use lies
- Headlines must feel written by a real person
- All flights are round trip, use it
- Use that language: ${language}
- Samples for styling: ${samples}
- Do not repeat last titles: ${lastTitles} and emodjis
- Do not use abbreviations
- Don't call the country of departure
- If you need to translate into Uzbek, use Cyrillic.`,
      },
    ],
    temperature: 1,
  });

  const title = response.choices[0].message.content.trim();

  await saveTitle(redis, title, REDIS_KEY);

  return title;
}

async function weekendFlights(
  CHANNEL_ID,
  airports,
  rateFlight,
  locale,
  REDIS_KEY,
  language,
  preMessage,
) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
  const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_API_TOKEN;
  let flights = [];

  console.log(`\n=== 🔎 TOP FOR TODAY FROM ALL ORIGINS ===`);

  // Делаем запросы по всем городам за вчера и сегодня с максимум 1 пересадкой, всё складываем во flights
  try {
    console.log("airports", airports);
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
        },
      );

      const allFlights = data?.data || [];
      // console.log(`  ➜ Received: ${allFlights.length}`);

      const filteredFlights = allFlights.filter((f) => {
        return f.transfers <= 2 && f.return_transfers <= 2;
      });

      // console.log(
      //   `  ➜ Filtered today-only from ${origin}: ${filteredFlights.length}`
      // );

      flights.push(...filteredFlights);
    }

    console.log(
      `\n📦 TOTAL FLIGHTS COLLECTED FROM ALL ORIGINS: ${flights.length}`,
    );

    if (flights.length === 0) {
      console.log("⚠️ No flights found for today");
      return;
    }

    const weekendFlights = filterWeekendTrips(flights, origin);

    console.log("weekendFlights:", weekendFlights.length);

    // === добавляем city names + geo + distance
    for (const flight of weekendFlights) {
      const [originName, originLon, originLat, originCountry] =
        await getCityName(flight.origin, locale);
      const [destinationName, destLon, destLat, destinationCountry] =
        await getCityName(flight.destination, locale);

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
        destLat,
      );
    }

    // === shuffle перемешиваем, сортируем
    flights = weekendFlights.sort((a, b) => a.price - b.price);
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

  // Передаем чату для создания заголовка
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
  const title = await getGPTTitle(
    JSON.stringify(ticketsForGPT),
    REDIS_KEY,
    language,
  );

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

        const depDate = dtDeparture.setLocale(locale).toFormat("dd LLL yyyy");
        const depTime = dtDeparture.toFormat("HH:mm");
        const retDate = dtReturn.setLocale(locale).toFormat("dd LLL yyyy");
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

  console.log("message", message);

  // ===============================================================
  //         👉 7. Получаем фото
  // ===============================================================
  const imgBuffer = await getCityImage(
    freshFlights[0].destinationName,
    freshFlights[0].destinationCountry,
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
      },
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
    },
  );

  // Добавляем все flights из freshFlights в базу данных
  for (const flight of freshFlights) {
    await addPosted(flight.uid);
    console.log(`💾 Saved with UID: ${flight.uid}`);
  }
  console.log(`\n✅ Posted`);
}

module.exports = { weekendFlights };

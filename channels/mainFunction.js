const axios = require("axios");
const FormData = require("form-data");
const { DateTime } = require("luxon");
const { extractShortLink } = require("../bot/encodeLink");
const { getCityName } = require("./getCityName");
const { getCityImage } = require("./getCityImage");
const { wasPosted, addPosted } = require("../bot/db");
const { haversineDistance } = require("./haversineDistance");
const { extractSearchDateISO } = require("./extractSearchDateISO");
const { shuffle } = require("./shuffle");
const { getFlightUID } = require("./getFlightUID");
import { Redis } from "@upstash/redis";
import OpenAI from "openai";
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
    "January plans? We’ve got something BIG for you 👀",
    "Bucharest → the seaside TOMORROW? Yes, it’s real 🌊",
    "🔥 Handpicked deals for our favorite travelers — don’t miss out!",
    "🚨 HOT deal just dropped — grab it before it’s gone!",
    "Fresh out of the oven: insane deal for St. Petersburg",
    "☀️ Escape the cold: 6 nights in the UAE from Yekaterinburg — only 24,400 RUB!",
    "⚡ Only for the fastest: dirt-cheap tickets to Egypt!",
    "🎄 The holiday magic starts NOW — don’t miss these deals!",
    "😳 You won’t believe this: direct flights from Krasnodar to Georgia are BACK!",
    "✈️ Straight to St. Petersburg — direct flights from Yekaterinburg!",
    "👀 Someone asked for cheap tickets to the US? Here you go!",
    "🎅 Santa left something special… and it’s waiting for YOU:",
    "🌍 All roads lead to Egypt — and prices are CRAZY low!",
    "🇹🇷 Turkey before New Year? These prices won’t last!",
    "🚀 Siberia, wake up — insanely cheap tickets are LIVE!",
    "🌴 Perm, ready for New Year by the Red Sea? Let’s go!",
    "🏔️ Caucasus calling: direct December flights from Bucharest!",
    "💸 This is what REAL cheap looks like — don’t blink!",
    "🔥 Finally! Cheap flights from Moscow to the Philippines are BACK!",
  ];

  const lastTitles = await getLastTitles(redis, REDIS_KEY);
  const destination_city = tickets[0].to;

  console.log("destination_city:", destination_city);

  const response = await openai.chat.completions.create({
    model: "gpt-5.4-nano",
    messages: [
      {
        role: "system",
        content: `You are emotional and unusual travel copywriter for Telegram channels.`,
      },
      {
        role: "user",
        content: `
Return emotional, unusual title about one of the most popular place in ${destination_city}
Rules:
- Strong about 100 characters in that headline, not more.
- Sound natural and human
- Use emoji (1-2) in start of title
- DO NOT use lies
- Headlines must feel written by a real person
- All flights are round trip, use it
- Use that language: ${language}
- Do not repeat last titles: ${lastTitles} and emodjis
- Do not use abbreviations
- Don't call the country of departure
- If you need to translate into Uzbek, use Cyrillic.
- Instead of the word "tour," use a synonym like "journey" or "trip."`,
      },
    ],
    temperature: 1,
  });

  const title = response.choices[0].message.content.trim();

  await saveTitle(redis, title, REDIS_KEY);

  return title;
}

async function main(
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

  //   async function TopForToday() {

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
        const sd = extractSearchDateISO(f.link);
        return (
          (sd === todayISO || sd === yesterdayISO) &&
          f.transfers <= 2 &&
          f.return_transfers <= 2
        );
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

    // === добавляем city names + geo + distance
    for (const flight of flights) {
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

    // === filtering good flights
    flights = flights.filter(rateFlight);
    console.log("filter flights:", flights.length);

    // === shuffle перемешиваем, сортируем
    flights = flights.sort((a, b) => a.price - b.price);
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
    .slice(0, 3)
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
    departure_at: f.departure_at,
    return_at: f.return_at,
  }));

  console.log(ticketsForGPT[0].to);

  // Формируем сообщение
  const title = await getGPTTitle(ticketsForGPT, REDIS_KEY, language);

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

module.exports = { main };

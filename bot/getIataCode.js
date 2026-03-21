const axios = require("axios");
const { OpenAI } = require("openai");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// === Универсальная функция для Redis REST API ===
async function redisRequest(method, key, value = null) {
  const url = `${UPSTASH_REDIS_REST_URL}/${method}/${encodeURIComponent(key)}${
    value ? `/${encodeURIComponent(value)}` : ""
  }`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
  });

  return res.json();
}

// === Основная функция поиска IATA-кода ===
async function getIataCode(cityName) {
  if (!cityName) return [null, null];

  const normalized = cityName.trim();

  // // 1️⃣ Поиск в Redis (таблица airports)
  // try {
  //   const json = await redisRequest("get", "airports");
  //   const airportsData = json?.result ? JSON.parse(json.result) : {};

  //   if (airportsData[normalized]) {
  //     console.log(
  //       `✅ Found in Redis: ${normalized} → ${airportsData[normalized]}`
  //     );
  //     return [airportsData[normalized], normalized];
  //   } else {
  //     console.log("⚠️ Not found in Redis, will try Travelpayouts...");
  //   }
  // } catch (err) {
  //   console.warn("❌ Error querying Redis:", err.message);
  // }

  // if (sendMessage) {
  //   await sendMessage("Looking for all airports in your city...");
  // }

  // 2️⃣ Запрос к Travelpayouts (города + аэропорты)
  try {
    const { data } = await axios.get(
      "https://autocomplete.travelpayouts.com/places2",
      {
        params: { term: normalized, locale: "en", types: ["city", "airport"] },
      },
    );

    const match = data.find((p) => p.type === "city") || data[0];
    if (match) {
      // Сохраняем в Redis (обновляем JSON)
      try {
        const json = await redisRequest("get", "airports");
        const airportsData = json?.result ? JSON.parse(json.result) : {};
        airportsData[match.name] = match.code;
        await redisRequest("set", "airports", JSON.stringify(airportsData));
      } catch (err) {
        console.warn(
          "⚠️ Could not save Travelpayouts result to Redis:",
          err.message,
        );
      }

      return [match.code, match.name, match.country_name];
    } else {
      console.log("⚠️ Travelpayouts did not return any cities.");
    }
  } catch (err) {
    console.warn("❌ Travelpayouts error:", err.message);
  }

  // 3️⃣ Fallback — ChatGPT
  console.log("🔹 Fallback to ChatGPT...");
  try {
    const prompt = `Какой основной IATA-код у города или аэропорта "${normalized}"?
  Если нет такого, то поищи ближайший аэропорт, из которого летают регулярные международные рейсы, и верни его IATA-код.
  Ответь строго в формате: 
      {
        name: string,
        code: string,
        country_name: string
      }

  name - main city name
  code - IATA код города
  country_name - название страны аэропорта

  Если тебе неизвестен город, то не спрашивай уточняющую информацию, просто верни информацию про Bucharest`;

    const res = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-5.2",
    });

    const raw = res.choices[0].message.content.trim();
    let code;
    try {
      code = JSON.parse(raw);
    } catch (e) {
      console.warn("⚠️ ChatGPT returned non-JSON, raw:", raw);
      throw e;
    }

    console.log(
      `✅ Found via ChatGPT: code.code, code.name, code.country_name`,
    );

    return [code.code, code.name, code.country_name];
  } catch (err) {
    console.error("❌ ChatGPT error:", err.message);
  }

  console.log("❌ Could not determine IATA code.");
  return [null, null, null];
}

module.exports = { getIataCode };

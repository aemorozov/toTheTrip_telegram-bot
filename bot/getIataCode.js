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
async function getIataCode(cityName, sendMessage) {
  if (!cityName) return [null, null];

  console.log(`\n🟢 Looking for IATA code for: "${cityName}"`);
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

  // 2️⃣ Запрос к Travelpayouts (только города)
  try {
    const { data } = await axios.get(
      "https://autocomplete.travelpayouts.com/places2",
      {
        params: { term: normalized, locale: "en", type: "city" },
      }
    );

    const match = data.find((p) => p.type === "city");
    if (match) {
      console.log(
        `✅ Found city via Travelpayouts: ${match.name} → ${match.code}`
      );

      // Сохраняем в Redis (обновляем JSON)
      try {
        const json = await redisRequest("get", "airports");
        const airportsData = json?.result ? JSON.parse(json.result) : {};
        airportsData[match.name] = match.code;
        await redisRequest("set", "airports", JSON.stringify(airportsData));
        console.log(`💾 Saved to Redis: ${match.name} → ${match.code}`);
      } catch (err) {
        console.warn(
          "⚠️ Could not save Travelpayouts result to Redis:",
          err.message
        );
      }

      return [match.code, match.name, match.country_name];
    } else {
      console.log("⚠️ Travelpayouts did not return any cities.");
    }
  } catch (err) {
    console.warn("❌ Travelpayouts error:", err.message);
  }

  if (sendMessage) {
    await sendMessage("Still searching, please wait...");
  }

  // 3️⃣ Fallback — ChatGPT
  console.log("🔹 Fallback to ChatGPT...");
  try {
    const prompt = `Какой основной IATA-код у города или аэропорта "${cityName}"? 
Если нет такого, то поищи ближайший аэропорт, из которого летают регулярные международные рейсы, и верни его IATA-код.
Ответь строго в формате: MOW,Moscow. Если тебе неизвестен город, то не спрашивай уточняющую информацию, просто верни "BUH,Bucharest"`;

    const res = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-5-mini",
    });

    let code = res.choices[0].message.content.trim();

    const [iata, name] = code.split(",");
    console.log(`✅ Found via ChatGPT: ${name} → ${iata}`);

    // Сохраняем в Redis
    try {
      const json = await redisRequest("get", "airports");
      const airportsData = json?.result ? JSON.parse(json.result) : {};
      airportsData[name] = iata;
      await redisRequest("set", "airports", JSON.stringify(airportsData));
      console.log(`💾 Saved ChatGPT result to Redis: ${name} → ${iata}`);
    } catch (err) {
      console.warn("⚠️ Could not save ChatGPT result to Redis:", err.message);
    }

    return [iata, name];
  } catch (err) {
    console.error("❌ ChatGPT error:", err.message);
  }

  console.log("❌ Could not determine IATA code.");
  return [null, null];
}

module.exports = { getIataCode };

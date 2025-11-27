const axios = require("axios");
const sharp = require("sharp");

const PEXELS_API_KEY = process.env.PEXEL_KEY;

// --------------- UTILS -----------------

// 1️⃣ Нормализуем название города через Aviasales places2
async function resolveCityViaAviasales(city) {
  try {
    const res = await axios.get("https://places.aviasales.com/v2/places.json", {
      params: {
        locale: "en",
        types: ["city"],
        term: city,
      },
    });

    if (!res.data?.length) return null;

    const item = res.data[0];

    return {
      city: item.name, // нормализованное имя (Bucharest)
      country: item.country_name, // нормализованная страна (Romania)
    };
  } catch (err) {
    console.log("Aviasales resolve error:", err.message);
    return null;
  }
}

/**
 * 2️⃣ Получаем QID города по названию
 */
async function fetchCityQID(cityName) {
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${cityName}&language=en&format=json&limit=1`;

    console.log("url: ", url);
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "TelegramCityBot/1.0", // ← ОБЯЗАТЕЛЬНО
      },
    });

    return res.data.search?.[0]?.id || null;
  } catch {
    return null;
  }
}

/**
 * 3️⃣ Получаем landmarks города по QID (Wikidata SPARQL)
 */
async function fetchLandmarks(qid) {
  const endpoint = "https://query.wikidata.org/sparql";
  const query = `
SELECT ?place ?placeLabel WHERE {
  ?place wdt:P131* wd:${qid}.  
  ?place wdt:P31/wdt:P279* ?type .
  VALUES ?type {
    wd:Q124714      # monument
    wd:Q5705        # palace
    wd:Q3947        # park
    wd:Q4989906     # tourist attraction
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      ?place wikibase:sitelinks ?links.
    }
    ORDER BY DESC(?links)
    LIMIT 20
  `;

  try {
    const res = await axios.get(endpoint, {
      params: { query },
      headers: { Accept: "application/sparql-results+json" },
    });

    if (!res.data.results?.bindings?.length) return [];

    return res.data.results.bindings.map((b) => b.placeLabel.value);
  } catch {
    return [];
  }
}

// ----------------------------------------

async function getCityImage(cityName, country = "") {
  try {
    // 1️⃣ Normalization (free + fast)
    const resolved = await resolveCityViaAviasales(cityName);
    cityName = resolved.city;
    country = resolved.country;
    console.log("Resolved:", cityName, country);

    // 2️⃣ Один запрос к Pexels
    const query = `${cityName} ${country} landmark street sky`;

    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: PEXELS_API_KEY },
      params: {
        query,
        per_page: 15, // выбираем 15 штук
        orientation: "landscape",
      },
    });

    const photos = res.data.photos || [];
    if (!photos.length) return null;

    console.log("photos: ", photos);

    const bestPhoto = photos[Math.floor(Math.random() * photos.length)];

    const url = bestPhoto.src.large2x || bestPhoto.src.large;
    if (!url) return null;

    // 4️⃣ Качаем → кропим → 1080×1080 → JPEG → отдаём
    const { data } = await axios.get(url, { responseType: "arraybuffer" });
    const input = sharp(Buffer.from(data));
    const meta = await input.metadata();

    const size = Math.min(meta.width, meta.height);

    return await input
      .extract({
        left: Math.floor((meta.width - size) / 2),
        top: Math.floor((meta.height - size) / 2),
        width: size,
        height: size,
      })
      .resize(1080, 1080)
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (err) {
    console.error("getCityImage error:", err.message);
    return null;
  }
}

module.exports = { getCityImage };

module.exports = { getCityImage };

const axios = require("axios");
const sharp = require("sharp");

const PEXELS_API_KEY = process.env.PEXEL_KEY;

// --------------- UTILS -----------------

/**
 * 1️⃣ Нормализуем название города через Aviasales places2
 * Возвращает:
 * city: Bucharest
 * country: Romania
 * iata: BUH
 */
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
    wd:Q570116      # historic site
    wd:Q839954      # architectural building
    wd:Q498238      # museum
    wd:Q5705        # palace
    wd:Q3947        # park
    wd:Q875744      # cathedral
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

    console.log("res.data.results?.bindings: ", res.data.results?.bindings);

    if (!res.data.results?.bindings?.length) return [];

    return res.data.results.bindings.map((b) => b.placeLabel.value);
  } catch {
    return [];
  }
}

// ----------------------------------------

async function getCityImage(cityName, country = "") {
  try {
    // ⭐️ 0. Normalize via Aviasales
    const resolved = await resolveCityViaAviasales(cityName);
    cityName = resolved.city;
    country = resolved.country;
    console.log("Resolved via Aviasales →", cityName, country);

    // 1️⃣ Get city QID
    const qid = await fetchCityQID(cityName);
    console.log("QID:", qid);

    let searchQueries = [];

    // 2️⃣ Wikidata landmarks
    if (qid) {
      const landmarks = await fetchLandmarks(qid);

      if (landmarks.length) {
        searchQueries = landmarks.map((lm) => `${lm} ${cityName} ${country}`);

        // remove duplicates
        searchQueries = [...new Set(searchQueries)];

        // filter garbage
        searchQueries = searchQueries.filter(
          (q) => q.length > 10 && q.split(" ").length >= 3
        );
      }
    }

    // 3️⃣ fallback если landmarks пустой
    if (!searchQueries.length) {
      searchQueries = [
        `${cityName} ${country} skyline`,
        `${cityName} ${country} historic center`,
        `${cityName} ${country} architecture`,
        `${cityName} ${country} panorama`,
        `${cityName} ${country} aerial`,
        `${cityName} ${country} landmarks`,
      ];
    }

    // 🔀 перемешиваем запросы
    searchQueries = searchQueries.sort(() => Math.random() - 0.5);

    // ⭐️ только первые 3 проверяем
    const limitedQueries = searchQueries.slice(0, 10); // 10 вариантов
    let attempts = 0;

    const collected = [];

    for (const query of limitedQueries) {
      if (attempts >= 3) break; // 👈 ОСТАНОВКА ПОСЛЕ 3
      attempts++;

      console.log("🔎 Searching:", query);

      const res = await axios.get("https://api.pexels.com/v1/search", {
        headers: { Authorization: PEXELS_API_KEY },
        params: {
          query,
          per_page: 5,
          orientation: "landscape",
        },
      });

      if (!res.data.photos?.length) continue;

      for (const photo of res.data.photos) {
        if (collected.length >= 3) break; // максимум 3 картинки

        const url = photo.src.large2x || photo.src.large;
        if (!url) continue;

        const { data } = await axios.get(url, { responseType: "arraybuffer" });
        const input = sharp(Buffer.from(data));
        const meta = await input.metadata();

        if (!meta.width || !meta.height) continue;

        const size = Math.min(meta.width, meta.height);

        const square = await input
          .extract({
            left: Math.floor((meta.width - size) / 2),
            top: Math.floor((meta.height - size) / 2),
            width: size,
            height: size,
          })
          .resize(1080, 1080)
          .jpeg({ quality: 90 })
          .toBuffer();

        collected.push(square);
      }
    }

    console.log("📸 Collected:", collected.length);

    if (!collected.length) return null;

    // отдаём случайную
    return collected[Math.floor(Math.random() * collected.length)];
  } catch (err) {
    console.error("CityImage error:", err.message);
    return null;
  }
}

module.exports = { getCityImage };

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

// Регионы России
// 📌 Regional city groups (EN)
const SIBERIA = [
  "Krasnoyarsk",
  "Novosibirsk",
  "Irkutsk",
  "Kemerovo",
  "Tomsk",
  "Tyumen",
  "Omsk",
  "Barnaul",
  "Novokuznetsk",
  "Chita",
  "Ulan-Ude",
  "Bratsk",
];

const URAL = [
  "Yekaterinburg",
  "Chelyabinsk",
  "Perm",
  "Ufa",
  "Magnitogorsk",
  "Nizhny Tagil",
  "Sterlitamak",
  "Orsk",
  "Miass",
  "Kurgan",
  "Salavat",
];

const VOLGA = [
  "Kazan",
  "Samara",
  "Nizhny Novgorod",
  "Ulyanovsk",
  "Saratov",
  "Volgograd",
  "Orenburg",
  "Penza",
  "Tolyatti",
  "Izhevsk",
  "Yoshkar-Ola",
  "Kirov",
  "Cheboksary",
  "Astrakhan",
];

const FAR_EAST = [
  "Vladivostok",
  "Khabarovsk",
  "Yakutsk",
  "Magadan",
  "Yuzhno-Sakhalinsk",
  "Petropavlovsk-Kamchatsky",
  "Anadyr",
  "Birobidzhan",
  "Blagoveshchensk",
  "Nakhodka",
];

const NORTHWEST = [
  "Murmansk",
  "Arkhangelsk",
  "Petrozavodsk",
  "Pskov",
  "Kaliningrad",
  "Novgorod",
  "Vologda",
  "Cherepovets",
  "Syktyvkar",
];

const CAUCASUS = [
  "Makhachkala",
  "Grozny",
  "Nalchik",
  "Vladikavkaz",
  "Stavropol",
  "Pyatigorsk",
  "Kislovodsk",
  "Mineralnye Vody",
  "Cherkessk",
  "Sochi",
];

async function getCityImage(cityName, country = "") {
  try {
    // -------------------------------
    // 1️⃣ Normalize city/country via Aviasales
    // -------------------------------
    const resolved = await resolveCityViaAviasales(cityName);
    cityName = resolved.city;
    country = resolved.country;

    // Не указываем "Russia" в запросах
    if (country === "Russia") {
      country = "";
    }

    // -------------------------------
    // 2️⃣ Если город в пресете → заменяем на регион
    // -------------------------------
    let regionQuery = null;

    // Проверка на принадлежность к региону России
    if (SIBERIA.includes(cityName)) regionQuery = "Siberia";
    if (URAL.includes(cityName)) regionQuery = "Ural";
    if (VOLGA.includes(cityName)) regionQuery = "Volga";
    if (FAR_EAST.includes(cityName)) regionQuery = "Far East Russia";
    if (NORTHWEST.includes(cityName)) regionQuery = "Northwest Russia";
    if (CAUCASUS.includes(cityName)) regionQuery = "Caucasus Russia";

    // -------------------------------
    // 3️⃣ Строим поисковый запрос
    // -------------------------------
    const query = regionQuery
      ? `${regionQuery}`
      : `${cityName} ${country} landmark street sky`;

    console.log("PEXELS QUERY →", query);

    // -------------------------------
    // 4️⃣ Запрос в Pexels
    // -------------------------------
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: PEXELS_API_KEY },
      params: {
        query,
        per_page: 15,
        orientation: "landscape",
      },
    });

    const photos = res.data.photos || [];
    if (!photos.length) return null;

    const bestPhoto = photos[Math.floor(Math.random() * photos.length)];
    const url = bestPhoto.src.large2x || bestPhoto.src.large;
    if (!url) return null;

    // -------------------------------
    // 5️⃣ Кроп и отдача
    // -------------------------------
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

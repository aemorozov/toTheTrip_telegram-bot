const axios = require("axios");

const UNSPLASH_KEY = process.env.UNSPLASH_KEY;

async function getCityImage(city, country) {
  const query = `${city} ${country}`;
  console.log(`🔍 Searching image for: ${query}`);

  try {
    // 1️⃣ Проверка ключа
    if (!UNSPLASH_KEY) {
      throw new Error("❌ UNSPLASH_ACCESS_KEY is missing");
    }

    // 2️⃣ Запрос к Unsplash API
    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query,
        per_page: 1,
        orientation: "landscape",
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_KEY}`,
      },
    });

    if (response.status !== 200) {
      console.error("❌ Unsplash returned non-200:", response.status);
      throw new Error(`Unsplash error ${response.status}`);
    }

    const results = response.data.results;
    if (results && results.length > 0) {
      const imgUrl = results[0].urls.regular;
      console.log(`✅ Found Unsplash image for ${query}`);
      return imgUrl;
    } else {
      console.warn(`⚠️ No Unsplash results for ${query}`);
      return `https://source.unsplash.com/1200x628/?${encodeURIComponent(
        query
      )}`;
    }
  } catch (err) {
    console.error("❌ Unsplash API error:", err.message);
    // fallback без токена
    const fallback = `https://source.unsplash.com/1200x628/?${encodeURIComponent(
      query
    )}`;
    console.log("🖼️ Using fallback image:", fallback);
    return fallback;
  }
}

module.exports = { getCityImage };

// const axios = require("axios");

// const UNSPLASH_KEY = process.env.UNSPLASH_KEY;

// async function getCityImage(city, country) {
//   const query = `${city} ${country}`;
//   console.log(`🔍 Searching image for: ${query}`);

//   try {
//     // 1️⃣ Проверка ключа
//     if (!UNSPLASH_KEY) {
//       throw new Error("❌ UNSPLASH_ACCESS_KEY is missing");
//     }

//     // 2️⃣ Запрос к Unsplash API
//     const response = await axios.get("https://api.unsplash.com/search/photos", {
//       params: {
//         query,
//         per_page: 1,
//         orientation: "landscape",
//       },
//       headers: {
//         Authorization: `Client-ID ${UNSPLASH_KEY}`,
//       },
//     });

//     if (response.status !== 200) {
//       console.error("❌ Unsplash returned non-200:", response.status);
//       throw new Error(`Unsplash error ${response.status}`);
//     }

//     const results = response.data.results;
//     if (results && results.length > 0) {
//       const imgUrl = results[0].urls.regular;
//       console.log(`✅ Found Unsplash image for ${query}`);
//       return imgUrl;
//     } else {
//       console.warn(`⚠️ No Unsplash results for ${query}`);
//       return `https://source.unsplash.com/1200x628/?${encodeURIComponent(
//         query
//       )}`;
//     }
//   } catch (err) {
//     console.error("❌ Unsplash API error:", err.message);
//     // fallback без токена
//     const fallback = `https://source.unsplash.com/1200x628/?${encodeURIComponent(
//       query
//     )}`;
//     console.log("🖼️ Using fallback image:", fallback);
//     return fallback;
//   }
// }

// module.exports = { getCityImage };

// getImages.js
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Генерирует красивую реалистичную картинку города через DALL·E 3 (gpt-image-1)
 * @param {string} city - Название города
 * @param {string} country - Название страны
 * @returns {Promise<string|null>} - Путь к сохранённому изображению
 */
async function getCityImage(city, country = "") {
  try {
    const prompt = `Beautiful high-quality travel photo of ${city}, ${country}.
    Daylight, realistic scenery, without text, without people, without watermark.`;

    const image = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
    });

    // 🖼️ Извлекаем base64
    const base64Data = image.data?.[0]?.b64_json;
    if (!base64Data) throw new Error("No base64 image data returned");

    // 💾 Сохраняем PNG во временный файл
    const outputDir = path.join(__dirname, "generated");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const filePath = path.join(outputDir, `${city.replace(/\s+/g, "_")}.png`);
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

    console.log("✅ Image saved locally:", filePath);
    return filePath;
  } catch (err) {
    console.error("⚠️ Image generation failed:", err.response?.data || err);
    return null;
  }
}

module.exports = { getCityImage };

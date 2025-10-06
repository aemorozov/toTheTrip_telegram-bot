// // getImages.js
// const OpenAI = require("openai");
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// /**
//  * Генерирует красивую реалистичную картинку города через DALL·E 3
//  * @param {string} city - Название города
//  * @param {string} country - Название страны (опционально)
//  * @returns {Promise<string|null>} - URL изображения или null
//  */
// async function getCityImage(city, country = "") {
//   try {
//     const prompt = `Beautiful high-quality travel photo of ${city}, ${country}.
//     Daylight, realistic scenery, without text, without people, without watermark.`;

//     const image = await openai.images.generate({
//       model: "gpt-image-1",
//       prompt,
//       size: "1024x1024",
//     });

//     const imageUrl = image.data[0].url;
//     console.log("🖼️ Generated image for:", city);
//     return imageUrl;
//   } catch (err) {
//     console.warn("⚠️ Image generation failed:", err.message);
//     return null;
//   }
// }

// module.exports = { getCityImage };

const axios = require("axios");

async function getCityImage(city, country = "") {
  try {
    const query = `${city} ${country}`.trim().replace(/\s+/g, "+");
    const url = `https://source.unsplash.com/1024x1024/?${query}`;
    return url; // мгновенный линк на случайное фото по теме
  } catch {
    return null;
  }
}

module.exports = { getCityImage };

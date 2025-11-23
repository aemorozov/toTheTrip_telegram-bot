const axios = require("axios");
const sharp = require("sharp");

const PEXELS_API_KEY = process.env.PEXEL_KEY;

// 👉 Основная функция
async function getCityImage(city) {
  const queries = [
    `${city} city center bright color`,
    // `${city} skyline`,
    // `${city} old town`,
    // `${city} streets`,
    // `${city} panorama`,
  ];

  const query = queries[Math.floor(Math.random() * queries.length)];

  try {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: { Authorization: PEXELS_API_KEY },
      params: {
        query,
        per_page: 5,
        orientation: "landscape",
      },
    });

    const photos = res.data.photos;
    if (!photos.length) return null;

    const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
    const imageUrl = randomPhoto?.src?.large2x;
    if (!imageUrl) return null;

    const { data } = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const inputBuffer = Buffer.from(data);

    // Квадратная обрезка
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    const size = Math.min(metadata.width, metadata.height);

    const square = await image
      .extract({
        left: Math.floor((metadata.width - size) / 2),
        top: Math.floor((metadata.height - size) / 2),
        width: size,
        height: size,
      })
      .resize(1080, 1080)
      .jpeg({ quality: 90 })
      .toBuffer();

    return square;
  } catch (err) {
    console.error("Pexels image error:", err.message);
    return null;
  }
}

module.exports = { getCityImage };

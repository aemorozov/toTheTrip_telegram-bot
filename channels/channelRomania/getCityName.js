const axios = require("axios");

async function getCityName(iataCode) {
  if (!iataCode) return null;

  const code = iataCode.trim().toUpperCase();

  // 2️⃣ Поиск в Travelpayouts
  try {
    const { data } = await axios.get(
      "https://autocomplete.travelpayouts.com/places2",
      {
        params: { term: code, locale: "ro" },
      }
    );

    // Ищем город, связанный с этим кодом
    const match = data.find((p) => p.code === code && p.type === "city");
    const found = match || data.find((p) => p.code === code);

    const name = found.name;
    const lon = found.coordinates.lon;
    const lat = found.coordinates.lat;
    const contry = found.country_name;

    if (found) {
      return [name, lon, lat, contry];
    } else {
      console.log("⚠️ Travelpayouts did not return a matching city.");
    }
  } catch (err) {
    console.warn("❌ Travelpayouts error:", err.message);
  }

  console.log("❌ Could not find city for IATA:", code);
  return null;
}

module.exports = { getCityName };

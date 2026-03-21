const axios = require("axios");
const { extractSearchDateISO } = require("../../channels/extractSearchDateISO");

// Сегодняшний день
const todayISO = new Date().toISOString().slice(0, 10);
// Вчера
const yesterdayISO = new Date(Date.now() - 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

async function specialOffersRoundTrip(origin) {
  try {
    const params = {
      currency: "eur",
      origin,
      unique: true,
      sorting: "price",
      direct: true,
      one_way: false,
      limit: 1000,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const res = await axios.get(
      "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
      { params },
    );

    const data = res.data?.data || {};

    const filteredFlights = data
      .filter((f) => {
        const sd = extractSearchDateISO(f.link);
        return (
          (sd === todayISO || sd === yesterdayISO) &&
          f.transfers === 0 &&
          f.return_transfers === 0
        );
      })
      .slice(0, 7);

    return filteredFlights;
  } catch (err) {
    console.error("[getCheapTickets ERROR]", err.response?.data || err.message);
    return [];
  }
}

module.exports = { specialOffersRoundTrip };

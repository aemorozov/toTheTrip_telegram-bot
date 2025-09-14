const axios = require("axios");

async function getCheapTicketsRoundTrip(origin) {
  try {
    const params = {
      currency: "usd",
      origin,
      unique: true,
      sorting: "price",
      direct: true,
      one_way: false,
      limit: 10,
      market: "us",
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const res = await axios.get(
      "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
      { params }
    );

    const data = res.data?.data || {};
    console.log("data: ", data);
    return data;
  } catch (err) {
    console.error("[getCheapTickets ERROR]", err.response?.data || err.message);
    return [];
  }
}

module.exports = { getCheapTicketsRoundTrip };

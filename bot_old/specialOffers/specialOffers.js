const axios = require("axios");

async function specialOffersOneWay(origin) {
  try {
    const params = {
      currency: "eur",
      origin,
      limit: 5,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const res = await axios.get(
      "https://api.travelpayouts.com/aviasales/v3/get_special_offers",
      { params }
    );

    const data = res.data?.data || {};
    return data;
  } catch (err) {
    console.error("[getCheapTickets ERROR]", err.response?.data || err.message);
    return [];
  }
}

async function specialOffersRoundTrip(origin) {
  try {
    const params = {
      currency: "eur",
      origin,
      unique: true,
      sorting: "route",
      direct: false,
      one_way: false,
      limit: 5,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const res = await axios.get(
      "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
      { params }
    );

    const data = res.data?.data || {};
    return data;
  } catch (err) {
    console.error("[getCheapTickets ERROR]", err.response?.data || err.message);
    return [];
  }
}

module.exports = { specialOffersOneWay, specialOffersRoundTrip };

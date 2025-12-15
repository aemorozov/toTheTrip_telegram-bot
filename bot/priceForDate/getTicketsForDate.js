const axios = require("axios");

async function getTicketsForDateOneWay(originIATA, date) {
  try {
    // гарантируем все ключи на месте
    const paramsOneWay = {
      currency: "eur",
      origin: originIATA,
      one_way: true,
      departure_at: date,
      direct: false,

      limit: 7,
      page: 1,
      sorting: "price",
      unique: true,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
    const fullUrl = `${url}?${new URLSearchParams(paramsOneWay).toString()}`;
    console.log("👉 getTicketsForDateOneWay: ", fullUrl);

    const res = await axios.get(url, { params: paramsOneWay });

    return (
      res.data?.data ||
      "Sorry, we can't find cheap flights on that day, try again please."
    );
  } catch (err) {
    console.error(
      "[getTicketsForDateOneWay ERROR]",
      err.response?.data || err.message
    );
    return [];
  }
}

async function getTicketsForDateRoundTrip(originIATA, date) {
  try {
    // гарантируем все ключи на месте
    const paramsRoundTrip = {
      currency: "eur",
      origin: originIATA,
      departure_at: date,
      one_way: false,
      direct: false,
      limit: 7,
      sorting: "price",
      unique: true,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates";
    const fullUrl = `${url}?${new URLSearchParams(paramsRoundTrip).toString()}`;
    console.log("👉 getTicketsForDateRoundTrip: ", fullUrl);

    const res = await axios.get(url, { params: paramsRoundTrip });

    return (
      res.data?.data ||
      "Sorry, we can't find cheap flights on that day, try again please."
    );
  } catch (err) {
    console.error(
      "[getTicketsForDateRoundTrip ERROR]",
      err.response?.data || err.message
    );
    return [];
  }
}

module.exports = {
  getTicketsForDateOneWay,
  getTicketsForDateRoundTrip,
};

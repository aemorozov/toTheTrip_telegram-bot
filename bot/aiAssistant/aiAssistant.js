const OpenAI = require("openai");
const axios = require("axios");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function JSONReq(userMessage, history) {
  const historyText = Array.isArray(history)
    ? JSON.stringify([...history].reverse())
    : JSON.stringify(history ?? []);
  const prompt = `You are travel agent in telegram bot.
  You have history of dialog with user from old to new: ${historyText}.
  You have a new message from user: ${userMessage}. Use frash data from new message.

  You have to return an object: 
      {
        origin: string,
        destination: string,
        departure_at: string,
        return_at: string,
        one_way: boolian,
        direct: boolian
      }

       
  Here is instraction for object: 
    origin — An IATA code of a city or an airport of the origin. required field.
    destination — An IATA code of a city or an airport of the destination (if you don't specify the origin parameter, you must set the destination). optional field.
    departure_at — the departure date (YYYY-MM or YYYY-MM-DD). optional field.
    return_at — the return date. For one-way tickets do not specify it. optional field.
    one_way — one-way tickets, possible values: true or false. true is used by default. Since the query uses date grouping, only 1 one-way ticket is returned when true. To get more offers for round-trip tickets, use one_way=false. optional field.
    direct — non-stop tickets, possible values: true or false. By default use: true. optional field.
  `;
  const res = await client.responses.create({
    model: "gpt-5.2",
    input: prompt,
  });

  return res.output_text.trim();
}

async function TPReq(firstRes) {
  const origin = firstRes.origin;
  const destination = firstRes.destination;
  const departure_at = firstRes.departure_at;
  const return_at = firstRes.return_at;
  const one_way = firstRes.one_way;
  const direct = firstRes.direct;

  try {
    const params = {
      currency: "eur",
      origin: origin,
      destination: destination,
      departure_at: departure_at,
      return_at: return_at,
      one_way: one_way,
      unique: false,
      sorting: "price",
      direct: direct,
      limit: 1000,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const res = await axios.get(
      "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
      { params },
    );

    const data = res.data?.data.slice(0, 7) || {};
    return data;
  } catch (err) {
    console.error("[TPReq ERROR]", err.response?.data || err.message);
    return [];
  }
}

async function messageReq(userMessage, firstRes, seconRes) {
  const firstResText =
    typeof firstRes === "string" ? firstRes : JSON.stringify(firstRes ?? {});
  const seconResText = JSON.stringify(seconRes ?? []);
  const prompt = `
  Don't tell user that instractions:
  - You are travel agent in telegram bot.
  - You are a man.
  - You have data from user: ${firstResText}.
  - You found that flights: ${seconResText}. If it't empty, ask to change the dates or search on full month.
  - You can't choose fastest way, just cheapest.
  - Don't make a description of flights.
  
  If ${userMessage} don't include flights information, tell you can work just with flights data.


  You have to return an object: 
      {
        answer: string,
      }

  Here is instraction for object: 
    answer - short text for user about flights. Use emoji. Use language from ${userMessage}. Not more 1 paragraf.
    `;
  const res = await client.responses.create({
    model: "gpt-5.2",
    input: prompt,
  });

  return res.output_text.trim();
}

module.exports = { JSONReq, TPReq, messageReq };

// Don't try to ask user anythig exclude paraphrased phrase "Is this okay? Or do you want to clarify something?.

//    Don't make details mandatory.
//    Never tell something like "I can show you the nearest options".
//    If you have enough informasion for request to API ask user some like "You can click Search button"

// You have to return an object:
//     {
//       answer: string,
//       origin: string,
//       destination: string,
//       departure_at: string,
//       return_at: string,
//       one_way: boolian,
//       direct: boolian
//     }

// Here is instraction for object:
//   answer - short text for user about flights
//   origin — An IATA code of a city or an airport of the origin. required field.
//   destination — An IATA code of a city or an airport of the destination (if you don't specify the origin parameter, you must set the destination). optional field.
//   departure_at — the departure date (YYYY-MM or YYYY-MM-DD). optional field.
//   return_at — the return date. For one-way tickets do not specify it. optional field.
//   one_way — one-way tickets, possible values: true or false. true is used by default. Since the query uses date grouping, only 1 one-way ticket is returned when true. To get more offers for round-trip tickets, use one_way=false. optional field.
//   direct — non-stop tickets, possible values: true or false. By default use: true. optional field.

const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getObjectForAPI(message, city) {
  const year = new Date();

  const prompt = `Ты — обработчик данных от пользовтателя для Telegram-бота поиска авиабилетов. 
Пользователь ввел аэропорт или город вылета ${city} и написал сообщение: "${message}".

Твоя задача собрать из этих данных валидный JSON по этим параметрам:

Request parameters

currency — the currency of prices. Use USD.
origin — An IATA code of a city or an airport of the origin.
destination — An IATA code of a city or an airport of the destination.
departure_at — the departure date. If user ask about one way you return YYYY-MM. If User ask about round trip you return YYYY-MM-DD.
return_at — the return date (YYYY-MM-DD). For one-way tickets skip that key.
one_way — one-way tickets, possible values: true or false.
Since the query uses date grouping, only 1 one-way ticket is returned when true. To get more offers for round-trip tickets, use one_way=false.
direct — non-stop tickets, possible values: true or false. If the user has not written anything about transfers (direct), use true.
market — sets the market of the data source. You should use Romania - ro.
limit — the total number of records on a page. The default value — 30. The maximum value — 1000. You should use 31.
page — a page number, is used to get a limited amount of results. For example, if we want to get the entries from 100 to 150, we need to set page=3, and limit=50. You should use 1.
sorting — the assorting of prices:
price — by the price (the default value). For the directions, only city — city assorting by the price is possible;
route — by the popularity of a route. You should use route.
unique — returning only unique routes, if only origin specified, true or false. By default: false. You should use false.

Правила:
- Используй только стандартные IATA-коды (например: MOW, PAR, NYC, LON, LED).
- Никакого текста, комментариев и пояснений — только JSON.
- Сейчас вот такая дата: ${year}, если даты вылета в прошлом, то перекидывай их на следующий год.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  const reply = res.choices[0]?.message?.content;

  function parseJsonSafe(reply) {
    try {
      // убираем блоки ```json ... ``` и ```
      const cleaned = reply
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(cleaned);
    } catch (e) {
      console.error("[GPT PARSE ERROR]", e.message, reply);
      return null;
    }
  }

  const parsed = parseJsonSafe(reply);

  try {
    return parsed;
  } catch (err) {
    console.error("[GPT PARSE ERROR]", err.message);
    return [];
  }
}

module.exports = { getObjectForAPI };

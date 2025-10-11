const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getObjectForAPI(originIATA, destinationIATA, isOneWay) {
  const year = new Date();

  const prompt = `Ты — обработчик данных от пользовтателя для Telegram-бота поиска авиабилетов. 
Пользователь ввел аэропорт или город вылета ${originIATA}, написал место назначения: "${destinationIATA}" и указал параметр one way: ${isOneWay}.

Твоя задача собрать из этих данных валидный JSON по этим параметрам:

Request parameters

currency — the currency of prices. Use USD.
origin — An IATA code of a city or an airport of the origin.
destination — An IATA code of a city or an airport of the destination.
departure_at — the departure date (YYYY-MM or YYYY-MM-DD). We skip that.
return_at — the return date (YYYY-MM). For one-way tickets skip that key.
one_way — one-way tickets, possible values: true or false.
Since the query uses date grouping, only 1 one-way ticket is returned when true. To get more offers for round-trip tickets, use one_way=false.
direct — non-stop tickets, possible values: true or false. We use false.
market — sets the market of the data source. You should use Romania - ro.
limit — the total number of records on a page. The default value — 30. The maximum value — 1000. You should use 31.
page — a page number, is used to get a limited amount of results. You should use price. For example, if we want to get the entries from 100 to 150, we need to set page=3, and limit=50. You should use 1.
sorting — the assorting of prices:
price — by the price (the default value). For the directions, only city — city assorting by the price is possible. 
route — by the popularity of a route. You should use price.
unique — returning only unique routes, if only origin specified, true or false. By default: false. You should use false.

Правила:
- Используй только стандартные IATA-коды (например: MOW, PAR, NYC, LON, LED).
- Никакого текста, комментариев и пояснений — только JSON.
- Сейчас вот такая дата: ${year}, если даты вылета в прошлом, то перекидывай их на ближайший возможный год, либо этот, либо следующий по ситуации.
- Если даты не указаны, то оставляй их пустыми, они в запрос не пойдут.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [{ role: "user", content: prompt }],
    verbosity: "low",
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

import { Redis } from "@upstash/redis";
import { shuffle } from "../shuffle";
import { getCityName } from "../../channels/getCityName";
import { getCityImage } from "../getCityImage";
import { startMenuButton } from "../callbacks";
import { safeSendPhoto } from "../telegram";
import { DateTime } from "luxon";
import { extractShortLink } from "../encodeLink";
import OpenAI from "openai";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = new Redis({ url, token });
const REDIS_KEY = "BotTitles";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getLastTitles(redis, REDIS_KEY) {
  return await redis.lrange(REDIS_KEY, 0, 9);
}

async function saveTitle(redis, title, REDIS_KEY) {
  await redis.lpush(REDIS_KEY, title);
  await redis.ltrim(REDIS_KEY, 0, 9);
}

async function getGPTTitle(tickets, originName, language = "en") {
  const samples = [
    "Думаем, чем займемся в январе:",
    "Жители Бухареста окажутся у моря уже завтра",
    "Мини-сборки для наших любимых путешественников:",
    "Еще горячая подборка:",
    "Горячий пирожок для Петербурга",
    "Туда, где тепло: 6 ночей в ОАЭ из Екатеринбурга за 24400 рублей с человека!",
    "А для самых быстрых есть дешёвые тикеты в Египет:",
    "Праздник к нам приходит:",
    "Давно мы уже такого не видели: прямые рейсы из Краснодара в Грузию",
    "Держим путь в Питер: прямые рейсы из Екб",
    "Кто там просил недорогие билеты в Америку?",
    "Дед Мороз заезжал в наш офис в Новосибирске и просил передать подарок для хороших мальчиков и девочек:",
    "Все дороги ведут в Египет:",
    "Летим смотреть предновогоднюю Турцию:",
    "Сибиряки, тут раздают дешёвые билеты:",
    "Пермяки, встречаем Новый год на берегу Красного моря:",
    "Едем на Кавказ: прямые декабрьские рейсы из Бухареста,",
    "Вот она, настоящая халява:",
    "Давненько мы уже не писали про билеты из Москвы на Филиппины!",
  ];

  const lastTitles = await getLastTitles(redis, REDIS_KEY);

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      {
        role: "system",
        content: `You are a professional travel copywriter for Telegram channels.`,
      },
      {
        role: "user",
        content: `Rules:
- Generate SHORT, emotional, unusual ONE headline about all flights ${tickets}
- Use ${originName} in title, this is origin name.
- Strong about 100 characters in that headline, not more.
- Sound natural and human
- Use emoji (1-2) in start of title
- DO NOT use lies
- Headlines must feel written by a real person
- All flights are round trip, use it
- Use that language: ${language}
- Samples for styling: ${samples}
- Do not repeat last titles: ${lastTitles} and emodjis
- Do not use abbreviations
- Don't call the country of departure
- If you need to translate into Uzbek, use Cyrillic.`,
      },
    ],
    temperature: 1,
  });

  const title = response.choices[0].message.content.trim();

  await saveTitle(redis, title, REDIS_KEY);

  return title;
}

export async function subscribeSender() {
  const subscribers = await redis.get("subscribers");

  for (const origin in subscribers) {
    const params = {
      currency: "eur",
      origin,
      unique: true,
      sorting: "price",
      direct: true,
      one_way: false,
      limit: 10,
      token: process.env.TRAVELPAYOUTS_API_TOKEN,
    };

    const qs = new URLSearchParams(params).toString();
    const res = await fetch(
      `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${qs}`,
    );

    const json = await res.json();
    const data = json?.data || {};

    const randomTicket = shuffle(data).slice(0, 1);

    if (randomTicket.length === 0) {
      continue;
    }

    const originInfo = await getCityName(origin, "en");
    const originName = originInfo?.[0] || null;

    const ticket = randomTicket[0];

    // console.log(ticket);
    const destinationIata = ticket.destination;
    const destinationInfo = await getCityName(destinationIata, "en");
    // console.log(destinationInfo);
    ticket.destination_city = destinationInfo?.[0] || null;
    ticket.destination_country = destinationInfo?.[3] || null;
    ticket.destination_country_code = destinationInfo?.[4] || null;

    const destination_iata = ticket.destination;
    const destination = ticket.destination_city;
    const destinationCountry = ticket.destination_country_code;
    const departure_date = DateTime.fromISO(ticket.departure_at, {
      setZone: true,
    })
      .setLocale("en")
      .toFormat("cccc dd LLL");
    const departure_time = DateTime.fromISO(ticket.departure_at, {
      setZone: true,
    }).toFormat("HH:mm");

    const depart_transfers = ticket.transfers;

    const return_date = DateTime.fromISO(ticket.return_at, {
      setZone: true,
    })
      .setLocale("en")
      .toFormat("cccc dd LLL");
    const return_time = DateTime.fromISO(ticket.return_at, {
      setZone: true,
    }).toFormat("HH:mm");

    const return_transfers = ticket.return_transfers;

    const searchPath = `${origin}${DateTime.fromISO(ticket.departure_at, {
      setZone: true,
    }).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
      ticket.return_at,
      {
        setZone: true,
      },
    ).toFormat("ddMM")}1`;
    const baseUrl = `https://www.aviasales.com/search/${searchPath}?currency=EUR`;
    const encodedUrl = encodeURIComponent(baseUrl);
    const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

    const depart_transfers_text =
      depart_transfers == "0" ? "" : `🔃 ${depart_transfers}`;
    const return_transfers_text =
      return_transfers == "0" ? "" : `🔃 ${return_transfers}`;

    const title = await getGPTTitle(ticket, originName);

    const message =
      `<b>${title}</b>:\n\n` +
      `✈️ to <b>${destination}, ${destinationCountry}</b> about <b>${
        ticket.price
      }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
        link,
      )}</a></u>\n` +
      `\n📢 Share it to your travel friend!`;

    const city = ticket.destination_city;
    const photo = await getCityImage(city);
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "👉        START MENU        👈",
              callback_data: "start_menu",
            },
          ],
        ],
      },
    };
    const chatIds = subscribers[origin];
    if (photo) {
      for (const chatId of chatIds) {
        await safeSendPhoto(chatId, photo, message, options);
      }
      continue;
    } else {
      for (const chatId of chatIds) {
        await startMenuButton(chatId, message);
      }
      continue;
    }
  }
}

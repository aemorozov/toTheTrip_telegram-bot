const { getUser, saveUserStep, getCityName } = require("./db");
const {
  getCheapTicketsRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/getCheapTicketsRoundTrip");
const { extractShortLink } = require("./encodeLink");
const {
  getCheapTicketsOneWay,
} = require("./getTOP10CheapestFlightsOneWay/getCheapTicketsOneWay");
const { safeSend } = require("./telegram");
const { startMenu } = require("./startMenu");
const { handleAddDestination } = require("./getFlightsWithDestination/");
const { DateTime } = require("luxon");
const {
  specialOffersOneWay,
  specialOffersRoundTrip,
} = require("./specialOffers/specialOffers");
const { addDate } = require("./priceForDate");

// Функция добавления кнопки со ссылкой на основное меню
async function startMenuButton(chatId, message) {
  await safeSend(chatId, message, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "** START MENU **",
            callback_data: "start_menu",
          },
        ],
      ],
    },
  });
}

async function handleCallbackQuery(chatId, data) {
  // При нажатии на кнопку возврата к основному меню
  if (data === "start_menu") {
    await saveUserStep(chatId, "no_step");
    const userObj = await getUser(chatId);
    const city = userObj?.city;
    await startMenu(chatId, city);
  }

  // При нажатии на кнопку ТОП билетов
  if (data === "get_top_10_one_way") {
    await saveUserStep(chatId, "no_step");

    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const originIATA = userObj.iata_code;
    const tickets = await getCheapTicketsOneWay(originIATA);

    await Promise.all(
      tickets.map(async (t) => {
        t.desination_city = await getCityName(t.destination);
      })
    );

    const message =
      tickets.length > 0
        ? `<b>🔥 TOP cheapest one way flights from ${userObj.city} for you</b>:\n\n` +
          tickets
            .map((t) => {
              const destination_iata = t.destination;
              const destination = t.desination_city;
              const departure_date = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("dd.MM");
              const departure_time = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("HH:mm");

              const searchPath = `${originIATA}${DateTime.fromISO(
                t.departure_at,
                {
                  setZone: true,
                }
              ).toFormat("ddMM")}${destination_iata}1`;
              const baseUrl = `https://www.aviasales.com/search/${searchPath}`;
              const encodedUrl = encodeURIComponent(baseUrl);
              const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

              const transfers = t.transfers;
              const textForTransfers = transfers == "0" ? "Direct" : transfers;

              return `✈️ to <b>${destination}</b> about <b>${
                t.price
              }$</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  🔃 ${textForTransfers}\n🔗 <u><a href="${link}">https://${extractShortLink(
                link
              )}</a></u>\n`;
            })
            .join("\n")
        : `<b>🔥 TOP cheapest one way flights from ${userObj.city} for you</b>:\n\n😢💔 Sorry, I didn't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;
    startMenuButton(chatId, message);
  }

  if (data === "get_top_10_round_trip") {
    await saveUserStep(chatId, "no_step");

    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const originIATA = userObj.iata_code;
    const tickets = await getCheapTicketsRoundTrip(originIATA);

    console.log(tickets);

    await Promise.all(
      tickets.map(async (t) => {
        t.desination_city = await getCityName(t.destination);
      })
    );

    const message =
      tickets.length > 0
        ? `<b>🔥 TOP cheapest round trip flights from ${userObj.city} for you</b>:\n\n` +
          tickets
            .map((t) => {
              const destination_iata = t.destination;
              const destination = t.desination_city;
              const departure_date = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("dd.MM");
              const departure_time = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("HH:mm");

              const depart_transfers = t.transfers;

              const return_date = DateTime.fromISO(t.return_at, {
                setZone: true,
              }).toFormat("dd.MM");
              const return_time = DateTime.fromISO(t.return_at, {
                setZone: true,
              }).toFormat("HH:mm");

              const return_transfers = t.return_transfers;

              const searchPath = `${originIATA}${DateTime.fromISO(
                t.departure_at,
                {
                  setZone: true,
                }
              ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
                t.return_at,
                {
                  setZone: true,
                }
              ).toFormat("ddMM")}1`;
              const baseUrl = `https://www.aviasales.com/search/${searchPath}`;
              const encodedUrl = encodeURIComponent(baseUrl);
              const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

              const depart_transfers_text =
                depart_transfers == "0" ? "Direct" : depart_transfers;
              const return_transfers_text =
                return_transfers == "0" ? "Direct" : return_transfers;

              return `✈️ to <b>${destination}</b> about <b>${
                t.price
              }$</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  🔃 ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  🔃 ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
                link
              )}</a></u>\n`;
            })
            .join("\n")
        : `<b>🔥 TOP cheapest round trip flights from ${userObj.city} for you</b>:\n\n😢💔 Sorry, I didn't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;

    startMenuButton(chatId, message);
  }

  // При нажатии на кнопку добавить пункт прибытия
  if (data === "cheapest_flights_to_destination") {
    await saveUserStep(chatId, "waiting_for_destination");
    handleAddDestination(chatId);
  }

  if (data === "special_offers") {
    await saveUserStep(chatId, "no_step");

    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const originIATA = userObj.iata_code;
    const originCity = userObj.city;
    const ticketsOneWay = await specialOffersOneWay(originIATA);
    const ticketsRoundTrip = await specialOffersRoundTrip(originIATA);

    await Promise.all(
      ticketsOneWay.map(async (t) => {
        t.desination_city = await getCityName(t.destination);
      })
    );

    await Promise.all(
      ticketsRoundTrip.map(async (t) => {
        t.desination_city = await getCityName(t.destination);
      })
    );

    const currentDate = new Date();
    const dateAndMonth =
      DateTime.fromJSDate(currentDate).toFormat("dd.MM.yyyy");

    const message =
      `<b>🔥 Scpecial offers from ${originCity} for ${dateAndMonth}</b>\n\n` +
      `<b>➡️✈️ One way tickets:</b>\n\n` +
      (ticketsOneWay.length > 0
        ? ticketsOneWay
            .map((t) => {
              const destination_iata = t.destination;
              const destinationCity = t.desination_city;
              const departure_date = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("dd.MM");
              const departure_time = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("HH:mm");

              const searchPath = `${originIATA}${DateTime.fromISO(
                t.departure_at,
                {
                  setZone: true,
                }
              ).toFormat("ddMM")}${destination_iata}1`;
              const baseUrl = `https://www.aviasales.com/search/${searchPath}`;
              const encodedUrl = encodeURIComponent(baseUrl);
              const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

              const textForTransfers = "🤷";

              return `💸 to <b>${destinationCity}</b> about <b>${
                t.price
              }$</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  🔃 ${textForTransfers}\n🔗 <u><a href="${link}">https://${extractShortLink(
                link
              )}</a></u>\n`;
            })
            .join("\n")
        : `😢💔 Sorry, I didn't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`) +
      `\n\n<b>🔁🛬 Round trip tickets:</b>\n\n` +
      (ticketsRoundTrip.length > 0
        ? ticketsRoundTrip
            .map((t) => {
              const destination_iata = t.destination;
              const destinationCity = t.desination_city;
              const departure_date = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("dd.MM");
              const departure_time = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("HH:mm");

              const depart_transfers = t.transfers;

              const return_date = DateTime.fromISO(t.return_at, {
                setZone: true,
              }).toFormat("dd.MM");
              const return_time = DateTime.fromISO(t.return_at, {
                setZone: true,
              }).toFormat("HH:mm");

              const return_transfers = t.return_transfers;

              const searchPath = `${originIATA}${DateTime.fromISO(
                t.departure_at,
                {
                  setZone: true,
                }
              ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
                t.return_at,
                {
                  setZone: true,
                }
              ).toFormat("ddMM")}1`;
              const baseUrl = `https://www.aviasales.com/search/${searchPath}`;
              const encodedUrl = encodeURIComponent(baseUrl);
              const link = `https://tp.media/r?marker=59890&trs=443711&p=4114&u=${encodedUrl}&campaign_id=100`;

              const depart_transfers_text =
                depart_transfers == "0" ? "Direct" : depart_transfers;
              const return_transfers_text =
                return_transfers == "0" ? "Direct" : return_transfers;

              return `💸 to <b>${destinationCity}</b> about <b>${
                t.price
              }$</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  🔃 ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  🔃 ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
                link
              )}</a></u>\n`;
            })
            .join("\n")
        : `😢💔 Sorry, I didn't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`);
    // : `<b>🔥 Special offers from ${originCity} for you</b>\n\n😢💔 Sorry, I didn't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;
    startMenuButton(chatId, message);
  }

  if (data === "price_for_date") {
    await saveUserStep(chatId, "waiting_for_date");
    addDate(chatId);
  }
}

module.exports = { handleCallbackQuery, startMenuButton };

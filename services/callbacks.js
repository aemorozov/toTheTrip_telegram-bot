const { getUser } = require("./db");
const {
  getCheapTicketsRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/getCheapTicketsRoundTrip");
const {
  translateCodesWithGPTRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/translateCodeWithGPTRoundTrip");
const {
  generatePartnerFlightLinkRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/generatePartnerFlightLinkRoundTrip");
const {
  extractShortLinkRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/encodeLinkRoundTrip");
const {
  getCheapTicketsOneWay,
} = require("./getTOP10CheapestFlightsOneWay/getCheapTicketsOneWay");
const {
  translateCodesWithGPTOneWay,
} = require("./getTOP10CheapestFlightsOneWay/translateCodeWithGPTOneWay");
const {
  generatePartnerFlightLinkOneWay,
} = require("./getTOP10CheapestFlightsOneWay/generatePartnerFlightLinkOneWay");
const {
  extractShortLinkOneWay,
} = require("./getTOP10CheapestFlightsOneWay/encodeLinkOneWay");
const {
  formatDateOneWay,
} = require("./getTOP10CheapestFlightsOneWay/formatDateOneWay");
const { safeSend } = require("./telegram");
const { startMenu } = require("./startMenu");
const {
  formatDateRoundTrip,
} = require("./getTOP10CheapestFlightsRoundTrip/formatDateRoundTrip");
const {
  handleAddDestinationAndDates,
} = require("./getFlightsWithDestinationAndDates/");

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
    const userObj = await getUser(chatId);
    const city = userObj?.city;
    await startMenu(chatId, city);
  }

  // При нажатии на кнопку ТОП-10 билетов
  if (data === "get_top_10_round_trip") {
    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const tickets = await getCheapTicketsRoundTrip(userObj.iata_code);
    let translations = [];
    try {
      translations = await translateCodesWithGPTRoundTrip(tickets);
    } catch (e) {}

    const origin = userObj.iata_code;
    const message =
      `<b>🔥 TOP-10 cheapest round trip flights from ${userObj.city} for you</b>:\n\n` +
      translations
        .map((t) => {
          const destination = t.iata;
          const depart_date = t.departure;
          const return_date = t.return;
          const city = t?.city;
          const link = generatePartnerFlightLinkRoundTrip({
            origin,
            destination,
            depart_date,
            return_date,
          });

          return `✈️ to <b>${city}</b> from <b>${
            t.price
          }$</b>\n📅 ${formatDateRoundTrip(t.departure)} ${
            t.departure_time
          } ⇄ ${formatDateRoundTrip(t.return)} ${
            t.return_time
          }\n🔗 <u><a href="${link}">https://${extractShortLinkRoundTrip(
            link
          )}</a></u>\n`;
        })
        .join("\n");

    startMenuButton(chatId, message);
  }

  if (data === "get_top_10_one_way") {
    const userObj = await getUser(chatId);
    if (!userObj?.iata_code) {
      await safeSend(
        chatId,
        "❌ Departure city is not set. 🔄 Send /start again."
      );
      return;
    }

    const tickets = await getCheapTicketsOneWay(userObj.iata_code);
    let translations = [];
    try {
      translations = await translateCodesWithGPTOneWay(tickets);
    } catch (e) {}

    const origin = userObj.iata_code;
    const message =
      `<b>🔥 TOP-10 cheapest one way flights from ${userObj.city} for you</b>:\n\n` +
      translations
        .map((t) => {
          const destination = t.iata;
          const depart_date = t.departure;
          const city = t?.city;
          const link = generatePartnerFlightLinkOneWay({
            origin,
            destination,
            depart_date,
          });

          return `✈️ to <b>${city}</b> from <b>${
            t.price
          }$</b>\n📅 ${formatDateOneWay(t?.departure)} ${
            t.time
          }\n🔗 <u><a href="${link}">https://${extractShortLinkOneWay(
            link
          )}</a></u>\n`;
        })
        .join("\n");

    startMenuButton(chatId, message);
  }

  // При нажатии на кнопку поиска с указанием места прибытия и дат
  if (data === "add_destination_and_dates") {
    await handleAddDestinationAndDates(chatId);
    return;
  }
}

module.exports = { handleCallbackQuery, startMenuButton };

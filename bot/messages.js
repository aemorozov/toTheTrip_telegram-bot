const { safeSend, safeSendPhoto } = require("./telegram");
const { getIataCode } = require("./getIataCode");
const {
  saveUser,
  getUserStep,
  getUser,
  saveUserDestination,
  saveUserStep,
  getCityName,
  updateUser,
} = require("./db");
const capabilities = require("./aiAssistant/capabilities.json");
const { startMenu } = require("./startMenu");
const {
  getTicketsForDestinationRoundTrip,
} = require("./getFlightsWithDestination/getTicketsForDestination");
const { DateTime } = require("luxon");
const { extractShortLink } = require("./encodeLink");
const {
  startMenuButton,
  get_top_10_round_trip,
  cheapest_flights_to_destination,
  special_offers,
  price_for_date,
  weekendFlights,
} = require("./callbacks");
const {
  getTicketsForDateRoundTrip,
} = require("./priceForDate/getTicketsForDate");
const { JSONReq, TPReq, messageReq } = require("./aiAssistant/aiAssistant");
const { getCityImage } = require("./getCityImage");

// Нормадизация даты
const LOCALES = [
  "en",
  "ru",
  "uk",
  "pl",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "sv",
  "no",
  "da",
  "fi",
  "cs",
  "sk",
  "sl",
  "hr",
  "ro",
  "hu",
  "sr",
  "bg",
  "mk",
  "lt",
  "lv",
  "et",
  "tr",
  "id",
  "ms",
  "fil",
  "hi",
  "ur",
  "zh",
  "zh-cn",
  "zh-tw",
  "ja",
  "ko",
];

function normalizeDate(input) {
  const text = input.trim();
  const now = DateTime.now();

  // Форматы С ГОДОМ
  const formatsWithYear = [
    // 12.03.2025 / 1.3.25
    "dd.MM.yyyy",
    "d.M.yyyy",
    "dd.MM.yy",
    "d.M.yy",
    "dd/MM/yyyy",
    "d/M/yyyy",
    "dd/MM/yy",
    "d/M/yy",
    "dd-MM-yyyy",
    "d-M-yyyy",
    "dd-MM-yy",
    "d-M-yy",
    "yyyy-MM-dd",
    "yyyy-M-d",
    "dd MM yyyy",
    "d M yyyy",

    // текстовые месяцы
    "d MMM yyyy",
    "d MMMM yyyy",
    "d MMM yy",
    "d MMMM yy",
    "MMM d, yyyy",
    "MMMM d, yyyy",
    "d-MMM-yyyy",
    "d-MMMM-yyyy",
  ];

  // Форматы БЕЗ ГОДА
  const formatsWithoutYear = [
    "dd.MM",
    "d.M",
    "dd/MM",
    "d/M",
    "dd-MM",
    "d-M",
    "dd MM",
    "d M",

    // текстовые месяцы
    "d MMM",
    "d MMMM",
    "MMM d",
    "MMMM d",
    "d-MMM",
    "d-MMMM",

    "dd MMM",
    "dd MMMM",
    "MMM dd",
    "MMMM dd",
    "dd-MMM",
    "dd-MMMM",
  ];

  // 1️⃣ Сначала пробуем форматы С ГОДОМ
  for (const locale of LOCALES) {
    for (const fmt of formatsWithYear) {
      const dt = DateTime.fromFormat(text, fmt, { locale });
      if (dt.isValid) {
        return dt.toFormat("yyyy-MM-dd");
      }
    }
  }

  // 2️⃣ Потом форматы БЕЗ ГОДА
  for (const locale of LOCALES) {
    for (const fmt of formatsWithoutYear) {
      let dt = DateTime.fromFormat(text, fmt, { locale });
      if (dt.isValid) {
        // подставляем текущий год
        dt = dt.set({ year: now.year });

        // если дата уже прошла — берём следующий год
        if (dt < now.startOf("day")) {
          dt = dt.plus({ years: 1 });
        }

        return dt.toFormat("yyyy-MM-dd");
      }
    }
  }

  // 3️⃣ Автопарсинг (на всякий случай)
  const auto = DateTime.fromJSDate(new Date(text));
  if (auto.isValid) {
    return auto.toFormat("yyyy-MM-dd");
  }

  return null;
}

async function handleTextMessage(chatId, userInput, userInfo) {
  const user = await getUser(chatId); // просто можем использовать

  // Проверяем, находится ли пользователь на каком-то шаге сценария
  const step = await getUserStep(chatId);
  if (step === "waiting_for_origin") {
    try {
      await saveUserStep(chatId, "no_step");
      const iataAndCity = await getIataCode(userInput);
      const iata = iataAndCity[0];
      const city = iataAndCity[1];
      const country = iataAndCity[2];
      if (!iata) {
        await safeSend(
          chatId,
          "Warning: I couldn't recognize the city you specified. Please try again.",
        );
        await saveUserStep(chatId, "waiting_for_origin");
        return;
      }

      await saveUser(userInfo, iata, city, country);
      await startMenu(chatId, city);
      return;
    } catch (err) {
      console.error("handleTextMessage error:", err);
      await safeSend(
        chatId,
        "Warning: Something went wrong while saving your city. Please try again.",
      );
      return;
    }
  } else if (step === "waiting_for_destination") {
    try {
      await saveUserStep(chatId, "no_step");
      const userObj = await getUser(chatId);
      const originIATA = userObj.iata_code;
      const originCity = userObj.city;
      const destinationFull = await getIataCode(userInput);
      const destinationIATA = destinationFull[0];
      const destinationCity = destinationFull[1];
      const destinationCountry = destinationFull[2];
      saveUserDestination(chatId, destinationIATA, destinationCity);

      const ticketsRoundTrip = await getTicketsForDestinationRoundTrip(
        originIATA,
        destinationIATA,
      );

      if (ticketsRoundTrip.length === 0) {
        const message = `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;
        return await startMenuButton(chatId, message);
      }

      for (const t of ticketsRoundTrip) {
        try {
          const info = await getCityName(t.destination);
          t.destination_city = info?.[0] || null;
          t.destination_country = info?.[1] || null;
          t.destination_country_code = info?.[2] || null;
        } catch (e) {
          console.log("getCityName ERROR:", e);
          t.destination_city = null;
          t.destination_country = null;
        }
      }

      const message =
        `<b>🔥 Cheapest round trip flights from ${originCity.toUpperCase()} to ${destinationCity.toUpperCase()}, ${destinationCountry}</b>\n\n` +
        (ticketsRoundTrip.length > 0
          ? ticketsRoundTrip
              .map((t) => {
                const destination_iata = t.destination;
                const departure_date = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("ccc dd LLL");
                const departure_time = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const depart_transfers = t.transfers;

                const return_date = DateTime.fromISO(t.return_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("ccc dd LLL");
                const return_time = DateTime.fromISO(t.return_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const return_transfers = t.return_transfers;

                const searchPath = `${originIATA}${DateTime.fromISO(
                  t.departure_at,
                  {
                    setZone: true,
                  },
                ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
                  t.return_at,
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

                return `💸 about <b>${
                  t.price
                }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
                  link,
                )}</a></u>\n`;
              })
              .join("\n") + `\n📢 Share it to your travel friend!`
          : `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`);
      const city = ticketsRoundTrip[0].destination_city;
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
      if (photo) {
        return await safeSendPhoto(chatId, photo, message, options);
      } else {
        return await startMenuButton(chatId, message);
      }
    } catch (err) {
      console.error("❌ handleTextMessage error:", err);
      await startMenuButton(
        chatId,
        "⚠️ Something went wrong and I couldn't recognize the city you specified. Return to the start menu and try again. ",
      );
    }
  } else if (step === "waiting_for_date") {
    try {
      await saveUserStep(chatId, "no_step");
      const userObj = await getUser(chatId);
      const originIATA = userObj.iata_code;
      const originCity = userObj.city;
      const date = normalizeDate(userInput);

      const ticketsRoundTrip = await getTicketsForDateRoundTrip(
        originIATA,
        date,
      );

      if (ticketsRoundTrip.length === 0) {
        const message = `😢💔 Sorry, I can't find the best results for ${userObj.city}, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`;
        return await startMenuButton(chatId, message);
      }

      for (const t of ticketsRoundTrip) {
        try {
          const info = await getCityName(t.destination);
          t.destination_city = info?.[0] || null;
          t.destination_country = info?.[1] || null;
          t.destination_country_code = info?.[2] || null;
        } catch (e) {
          console.log("getCityName ERROR:", e);
          t.destination_city = null;
          t.destination_country = null;
        }
      }

      const message =
        `<b>🔥 Cheapest round trip flights from ${originCity.toUpperCase()} on ${userInput}</b>\n\n` +
        (ticketsRoundTrip.length > 0
          ? ticketsRoundTrip
              .map((t) => {
                const destination_iata = t.destination;
                const destinationCity = t.destination_city;
                const destinationCountryCode = t.destination_country_code;
                const departure_date = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("ccc dd LLL");
                const departure_time = DateTime.fromISO(t.departure_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const depart_transfers = t.transfers;

                const return_date = DateTime.fromISO(t.return_at, {
                  setZone: true,
                })
                  .setLocale("en")
                  .toFormat("ccc dd LLL");
                const return_time = DateTime.fromISO(t.return_at, {
                  setZone: true,
                }).toFormat("HH:mm");

                const return_transfers = t.return_transfers;

                const searchPath = `${originIATA}${DateTime.fromISO(
                  t.departure_at,
                  {
                    setZone: true,
                  },
                ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
                  t.return_at,
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

                return `💸 to <b>${destinationCity}, ${destinationCountryCode}</b> about <b>${
                  t.price
                }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n🔗 <u><a href="${link}">https://${extractShortLink(
                  link,
                )}</a></u>\n`;
              })
              .join("\n") + `\n📢 Share it to your travel friend!`
          : `😢💔 Sorry, I can't find the best results, check it please on <a href="https://aviasales.tpo.mx/zniZ3SEe">https://aviasales.com</a>`);

      const city = ticketsRoundTrip[0].destination_city;
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
      if (photo) {
        return await safeSendPhoto(chatId, photo, message, options);
      } else {
        return await startMenuButton(chatId, message);
      }
    } catch (err) {
      console.error("❌ handleTextMessage error:", err);
      await startMenuButton(
        chatId,
        "⚠️ Error processing data. Try again Something went wrong and I couldn't recognize the date you specified. Please return to the start menu and try again. ",
      );
    }
  } else if (userInput === "/cheapflights") {
    await saveUserStep(chatId, "no_step");
    await get_top_10_round_trip(chatId);
  } else if (userInput === "/specialoffers") {
    await saveUserStep(chatId, "no_step");
    await special_offers(chatId);
  } else if (userInput === "/weekendsonly") {
    await saveUserStep(chatId, "no_step");
    await weekendFlights(chatId);
  } else if (userInput === "/adddate") {
    await saveUserStep(chatId, "no_step");
    await price_for_date(chatId);
  } else if (userInput === "/adddestination") {
    await saveUserStep(chatId, "no_step");
    await cheapest_flights_to_destination(chatId);
  } else if (userInput === "/city") {
    await saveUserStep(chatId, "waiting_for_origin");
    await safeSend(chatId, "Please enter your departure city.");
    return;
  } else if (userInput === "/exit") {
    await saveUserStep(chatId, "no_step");
    const userObj = await getUser(chatId);
    const city = userObj.city;
    const country = userObj.country;
    await safeSend(chatId, "Exited AI assistant mode.");
    await startMenu(chatId, city, country);
    return;
  } else {
    const user = await getUser(chatId);

    const userFlightObject = user.userFlightObject || {};

    console.log("chatId: ", chatId, "  userInput: ", userInput);

    const firstRes = await JSONReq(userInput, userFlightObject);
    console.log("firstRes", firstRes);

    if (firstRes?.unsupported_reason) {
      const message =
        `I can search for flights by exact date, destination, or no date. ` +
        `Examples: "Rome 12.04", "from OTP to BCN", "to Paris".`;
      return await startMenuButton(chatId, message);
    }

    if (!firstRes.origin && user?.iata_code) {
      firstRes.origin = user.iata_code;
    }

    if (firstRes.one_way === null || firstRes.one_way === undefined) {
      firstRes.one_way = capabilities?.defaults?.one_way ?? true;
    }
    if (firstRes.direct === null || firstRes.direct === undefined) {
      firstRes.direct = capabilities?.defaults?.direct ?? true;
    }

    if (!firstRes.origin) {
      const message = `Не вижу город вылета. Напиши его, например: "из OTP в BCN" или "Бухарест — Рим".`;
      return await startMenuButton(chatId, message);
    }

    await updateUser(chatId, { userFlightObject: firstRes });

    const seconRes = await TPReq(firstRes);
    console.log("seconRes", seconRes);

    const thirdRes = await messageReq(userInput, seconRes);
    console.log("thirdRes", thirdRes);

    for (const t of seconRes) {
      try {
        const info = await getCityName(t.destination);
        t.destination_city = info?.[0] || null;
        t.destination_country = info?.[1] || null;
        t.destination_country_code = info?.[2] || null;
        const originInfo = await getCityName(t.origin);
        t.origin_city = originInfo?.[0] || null;
        t.origin_country = originInfo?.[1] || null;
        t.origin_country_code = originInfo?.[2] || null;
      } catch (e) {
        console.log("getCityName ERROR:", e);
      }
    }

    const message =
      seconRes.length > 0
        ? `${JSON.parse(thirdRes).answer}\n\n` +
          seconRes
            .map((t) => {
              const originCity = t.origin_city;
              const originCountryCode = t.origin_country_code;
              const destination_iata = t.destination;
              const destination = t.destination_city;
              const destinationCountry = t.destination_country_code;
              const departure_date = DateTime.fromISO(t.departure_at, {
                setZone: true,
              })
                .setLocale("en")
                .toFormat("ccc dd LLL");
              const departure_time = DateTime.fromISO(t.departure_at, {
                setZone: true,
              }).toFormat("HH:mm");

              const depart_transfers = t.transfers;

              const return_date = t.return_at
                ? DateTime.fromISO(t.return_at, {
                    setZone: true,
                  })
                    .setLocale("en")
                    .toFormat("ccc dd LLL")
                : null;
              const return_time = t.return_at
                ? DateTime.fromISO(t.return_at, {
                    setZone: true,
                  }).toFormat("HH:mm")
                : null;

              const return_transfers = t.return_transfers;

              const searchPath = `${t.origin}${DateTime.fromISO(
                t.departure_at,
                {
                  setZone: true,
                },
              ).toFormat("ddMM")}${destination_iata}${DateTime.fromISO(
                t.return_at,
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

              return `✈️ From ${originCity}, ${originCountryCode}\n✈️ to <b>${destination}, ${destinationCountry}</b> about <b>${
                t.price
              }€</b>\n📅 <b>${departure_date}</b>  🕐 ${departure_time}  ${depart_transfers_text}\n${return_date ? `📅 <b>${return_date}</b>  🕐 ${return_time}  ${return_transfers_text}\n` : ""}🔗 <u><a href="${link}">https://${extractShortLink(
                link,
              )}</a></u>\n`;
            })
            .join("\n") +
          `\n📢 Nice idea to share it!`
        : `${JSON.parse(thirdRes).answer}`;

    return await startMenuButton(chatId, message);
  }
}
module.exports = { handleTextMessage };

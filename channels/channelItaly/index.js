import { main } from "../mainFunction";

const CHANNEL_ID = "@CheapFlightsItaly";
const airports = [
  "ROM", // Roma (Fiumicino + Ciampino)
  "MIL", // Milano (Malpensa + Linate + Bergamo)
  "VCE", // Venezia
  "NAP", // Napoli
  "BLQ", // Bologna
  "FLR", // Firenze
  "TRN", // Torino
  "VRN", // Verona
  "PSA", // Pisa
  "CAG", // Cagliari
  "PMO", // Palermo
  "CTA", // Catania
  "BRI", // Bari
  "OLB", // Olbia
  "AOI", // Ancona
  "TSF", // Treviso
  "LMP", // Lampedusa
  "REG", // Reggio Calabria
  "PEG", // Perugia
  "RMI", // Rimini
];
const locale = "it"; // for getCityName and depDate = dtDeparture.setLocale("ro")
const rateFlight = (f) => {
  const price = f.price;
  const dist = f.distance;
  const transfers = Math.max(f.transfers, f.return_transfers);

  // Проверяем билет

  if (price < 40) {
    if (transfers === 0) {
      console.log(
        `TRUE, price < 40 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 3500) {
    if (transfers === 0 && price <= 50) {
      console.log(
        `TRUE, price <= 50, dist < 3500 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 5000) {
    if (transfers === 0 && price <= 100) {
      console.log(
        `TRUE, price < 100, dist < 5000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 8000) {
    if (transfers === 0 && price <= 400) {
      console.log(
        `TRUE, price < 400, dist < 8000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist < 10000) {
    if (transfers === 0 && price <= 500) {
      console.log(
        `TRUE, price < 500, dist < 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    if (transfers === 1 && price <= 300) {
      console.log(
        `TRUE, price < 300, dist < 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    }
    return false;
  }

  if (dist >= 10000) {
    if (price <= 500 && transfers <= 1) {
      console.log(
        `TRUE, price < 500, dist >= 10000 ` +
          `Rate from ${f.originName} to ${f.destinationName}, distance ${f.distance}, price ${f.price}, max transfers ${transfers}`
      );
      return true;
    } // супер-финды!
    return false;
  }

  return false;
};
const REDIS_KEY = "Italy:last_titles";
const language = "it";
const shareText = "Condividilo con gli amici";
const linkText = "Il tuo bot per voli economici";
const preMessage = {
  flightItem({
    originName,
    destinationName,
    price,
    depDate,
    depTime,
    depTransfers,
    retDate,
    retTime,
    retTransfers,
    link,
    short,
  }) {
    return `
✈️ <b>${originName}</b> ⇄ <b>${destinationName}</b>
💶 approx. <b>${price}€</b>
📅 <b>${depDate}  🕓 ${depTime}</b>${
      depTransfers == 0 ? "" : `  🔃 ${depTransfers}`
    }
📅 <b>${retDate}  🕓 ${retTime}</b>${
      retTransfers == 0 ? "" : `  🔃 ${retTransfers}`
    }
🔗 Collegamento: <a href="${link}"><b>https://${short}</b></a>\n`;
  },

  footer() {
    return `\n📢 ${shareText}!\n\n🤖 <b><a href="https://t.me/CheapFlightsToTheTripBot">${linkText}</a></b>`;
  },
};

async function TopForToday() {
  await main(
    CHANNEL_ID,
    airports,
    rateFlight,
    locale,
    REDIS_KEY,
    language,
    preMessage
  );
}

module.exports = { TopForToday };

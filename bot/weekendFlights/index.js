const { DateTime } = require("luxon");
const axios = require("axios");

export function filterWeekendTrips(tickets) {
  console.log("start filterWeekendTrips");
  const isDepartInWindow = (depart) => {
    if (depart.weekday === 4) return depart.hour >= 20;
    if (depart.weekday === 5) return true;
    if (depart.weekday === 6) return depart.hour < 12;
    return false;
  };

  const isReturnInWindow = (ret) => {
    if (ret.weekday === 7) return ret.hour > 6;
    if (ret.weekday === 1) return true;
    if (ret.weekday === 2) return ret.hour < 2;
    return false;
  };

  const isWeekRelationOk = (depart, ret) => {
    const sameWeek =
      depart.weekYear === ret.weekYear && depart.weekNumber === ret.weekNumber;
    const nextWeek = (() => {
      const plus1 = depart.plus({ weeks: 1 });
      return (
        plus1.weekYear === ret.weekYear && plus1.weekNumber === ret.weekNumber
      );
    })();

    if (ret.weekday === 7) return sameWeek;
    if (ret.weekday === 1 || ret.weekday === 2) return nextWeek;
    return false;
  };

  const res = [];

  for (const t of tickets) {
    const depart = DateTime.fromISO(t.departure_at, { setZone: true });
    const ret = DateTime.fromISO(t.return_at, { setZone: true });

    const validDates = depart.isValid && ret.isValid;

    const durationHours = validDates ? ret.diff(depart, "hours").hours : NaN;
    const durationOk = validDates && durationHours >= 26;

    const departOk = validDates && isDepartInWindow(depart);
    const returnOk = validDates && isReturnInWindow(ret);
    const weekOk = validDates && isWeekRelationOk(depart, ret);

    const pass = validDates && departOk && returnOk && weekOk && durationOk;

    if (pass) res.push(t);
  }

  return res;
}

export async function getWeekendTickets(origin) {
  console.log("start getWeekendTickets");
  const params = {
    currency: "eur",
    origin,
    one_way: false,
    direct: true,
    limit: 300,
    page: 1,
    sorting: "price",
    unique: true,
    token: process.env.TRAVELPAYOUTS_API_TOKEN,
  };

  const res = await axios.get(
    "https://api.travelpayouts.com/aviasales/v3/prices_for_dates",
    { params }
  );

  const tickets = res.data?.data || [];

  const weekendTickets = filterWeekendTrips(tickets);

  return weekendTickets;
}

module.exports = {
  getWeekendTickets,
  filterWeekendTrips,
};

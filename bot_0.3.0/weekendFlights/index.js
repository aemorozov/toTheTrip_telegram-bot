const { DateTime } = require("luxon");
const axios = require("axios");

export async function filterWeekendTrips(tickets, originIATA) {
  /* ───────────── 1. COUNTRY BY ORIGIN (places2) ───────────── */
  const placesRes = await axios.get(
    "https://autocomplete.travelpayouts.com/places2",
    {
      params: {
        term: originIATA,
        locale: "en",
        types: "city",
      },
    },
  );

  const countryCode =
    placesRes.data?.[0]?.country_code || placesRes.data?.[0]?.country;

  if (!countryCode) {
    console.warn("❌ Cannot determine country for origin:", originIATA);
    return [];
  }

  /* ───────────── 2. HOLIDAYS (Nager.Date) ───────────── */
  const yearSet = new Set();
  tickets.forEach((t) => {
    yearSet.add(DateTime.fromISO(t.departure_at).year);
    yearSet.add(DateTime.fromISO(t.return_at).year);
  });

  const holidays = [];

  for (const year of yearSet) {
    const res = await axios.get(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
    );
    holidays.push(...res.data);
  }

  /* ───────────── 3. HOLIDAY + BRIDGE DAYS SET ───────────── */
  const holidayDates = holidays.map((h) => DateTime.fromISO(h.date));

  const isHolidayTrip = (d, r) => {
    return holidayDates.some((h) => {
      const dDiff = Math.abs(d.startOf("day").diff(h, "days").days);
      const rDiff = Math.abs(r.startOf("day").diff(h, "days").days);

      // праздник + максимум 1 bridge-день
      return dDiff <= 1 || rDiff <= 1;
    });
  };

  /* ───────────── 4. HELPERS ───────────── */
  const isDepartInWeekendWindow = (d) =>
    (d.weekday === 4 && d.hour >= 20) ||
    d.weekday === 5 ||
    (d.weekday === 6 && d.hour < 12);

  const isReturnInWeekendWindow = (r) =>
    (r.weekday === 7 && r.hour > 6) ||
    r.weekday === 1 ||
    (r.weekday === 2 && r.hour < 2);

  const isWeekRelationOk = (d, r) => {
    const departWeekEnd = d.endOf("week"); // воскресенье 23:59
    const nextWeekEnd = departWeekEnd.plus({ weeks: 1 });

    if (r.weekday === 7) {
      // воскресенье — до конца текущей недели
      return r <= departWeekEnd;
    }

    if (r.weekday === 1 || r.weekday === 2) {
      // пн/вт — строго следующая неделя
      return r > departWeekEnd && r <= nextWeekEnd;
    }

    return false;
  };

  /* ───────────── 5. FILTER ───────────── */
  const result = [];

  for (const t of tickets) {
    const depart = DateTime.fromISO(t.departure_at, { setZone: true });
    const ret = DateTime.fromISO(t.return_at, { setZone: true });

    if (!depart.isValid || !ret.isValid) continue;

    const durationHours = ret.diff(depart, "hours").hours;
    const durationOk = durationHours >= 26 && durationHours <= 96;

    const weekendTrip =
      isDepartInWeekendWindow(depart) &&
      isReturnInWeekendWindow(ret) &&
      isWeekRelationOk(depart, ret);

    const holidayTrip = isHolidayTrip(depart, ret);

    const pass = durationOk && (weekendTrip || holidayTrip);

    if (pass) {
      result.push(t);
    }
  }

  return result;
}

export async function getWeekendTickets(originIATA) {
  const params = {
    currency: "eur",
    origin: originIATA,
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
    { params },
  );

  const tickets = res.data?.data || [];

  // 🔥 ФИЛЬТРАЦИЯ ТУТ
  return await filterWeekendTrips(tickets, originIATA);
}

module.exports = {
  getWeekendTickets,
  filterWeekendTrips,
};

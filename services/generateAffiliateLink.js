// services/generateAffiliateLink.js
const querystring = require('querystring');

/**
 * Ожидает ticket с полями:
 *  - destination (IATA)
 *  - depart_date (YYYY-MM-DD)  <-- обязательно
 *  - (опционально) return_date (YYYY-MM-DD)
 *
 * origin: строка, IATA код отправления
 *
 * Возвращает: URL-строку или null, если недостаточно данных.
 *
 * ENV:
 *  - TRAVELPAYOUTS_MARKER  (рекомендуется)
 *  - AFFILIATE_BASE (по умолчанию 'www.aviasales.com')
 *
 * Примечание: мы формируем Aviasales-style URL: /search/ORIGDESTDDMM1?marker=...
 * Если тебе нужен другой формат (redirect Travelpayouts и т.п.) — пришли пример и я адаптирую.
 */

function toYYYYMMDD(dateStr) {
    if (!dateStr) return null;
    // Допускаем уже YYYY-MM-DD или ISO + time. Берём только начальную YYYY-MM-DD часть.
    const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
}

function ddmmFromYYYYMMDD(dateStr) {
    // dateStr обязателен в формате YYYY-MM-DD
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const [, mm, dd] = parts;
    return `${dd.padStart(2, '0')}${mm.padStart(2, '0')}`;
}

module.exports = function generateAffiliateLink({ ticket = {}, origin }) {
    const marker = process.env.TRAVELPAYOUTS_MARKER || '';
    const base = process.env.AFFILIATE_BASE || 'www.aviasales.com';

    const dest = (ticket.destination || ticket.to || ticket.iata || '').toUpperCase();
    if (!origin || !dest) return null;

    // Берём дату отправления — если её нет, вернём null (по требованию: дата обязательна)
    const rawDate = ticket.depart_date || ticket.departure_date || ticket.departure_at || ticket.departure;
    const ymd = toYYYYMMDD(rawDate);
    if (!ymd) {
        // Логирование лучше делать в вызывающем коде; здесь просто возвращаем null
        return null;
    }

    const ddmm = ddmmFromYYYYMMDD(ymd);
    if (!ddmm) return null;

    // Формат: ORIGDESTDDMM1 (1 adult) — это простой кликабельный поиск
    const path = `/search/${origin}${dest}${ddmm}1`;

    const qs = {};
    if (marker) qs.marker = marker;

    const url = `https://${base}${path}${Object.keys(qs).length ? ('?' + querystring.stringify(qs)) : ''}`;
    return url;
};

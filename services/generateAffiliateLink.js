// services/generateAffiliateLink.js
/**
 * Формирует партнёрскую ссылку для билета.
 *
 * Поддерживаемый формат ссылки — Aviasales search URL:
 *   https://www.aviasales.com/search/{ORIGIN}{DESTINATION}{DEPART_DATE}1?marker={MARKER}
 *
 * Параметры:
 * - ticket: объект билета (ожидаем поля destination (IATA), maybe depart_date в формате YYYY-MM-DD)
 * - origin: IATA код города вылета
 *
 * Переменные окружения:
 * - process.env.TRAVELPAYOUTS_MARKER  — твой marker/partner id из Travelpayouts
 * - process.env.AFFILIATE_BASE (опционально) — базовый домен, если хочешь кастомизировать (по умолчанию aviasales.com)
 *
 * Возвращает: строка с URL (https://...)
 */
const querystring = require('querystring');

function padDateForAviasales(dateStr) {
    // Aviasales expects date as DDMM (day month) optionally plus year? 
    // Simпle approach: if we have YYYY-MM-DD, we'll use DDMM (most common simple search)
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-');
        if (!y || !m || !d) return '';
        // Aviasales search often allows DDMM format, e.g. 2505 for 25 May
        return `${d.padStart(2, '0')}${m.padStart(2, '0')}`;
    } catch (e) {
        return '';
    }
}

module.exports = function generateAffiliateLink({ ticket = {}, origin }) {
    const marker = process.env.TRAVELPAYOUTS_MARKER || process.env.AFFILIATE_MARKER || '';
    const base = process.env.AFFILIATE_BASE || 'www.aviasales.com';

    const dest = (ticket.destination || ticket.to || ticket.iata || '').toUpperCase();
    if (!origin || !dest) return null;

    // Try to include departure date if available (YYYY-MM-DD)
    let datePart = '';
    const departDate = ticket.depart_date || ticket.departure_at || ticket.departure_date;
    const padded = padDateForAviasales(departDate);
    if (padded) {
        // Aviasales search pattern: ORIGDESTDDMM (no separators), plus "1" for one adult (simple)
        datePart = padded;
    }

    // Build path like /search/ORIGDESTDDMM1
    const path = `/search/${origin}${dest}${datePart}1`;

    // Query: include marker and show_to_affiliates param if needed
    const qs = {};
    if (marker) qs.marker = marker;
    // other optional params can be appended if needed:
    // qs.show_to_affiliates = 'true';

    const url = `https://${base}${path}${Object.keys(qs).length ? ('?' + querystring.stringify(qs)) : ''}`;
    return url;
};

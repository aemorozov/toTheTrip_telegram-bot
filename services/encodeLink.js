function extractShortLink(link) {
  try {
    const uParam = new URL(link).searchParams.get("u");
    if (!uParam) return null;

    const decoded = decodeURIComponent(uParam); // например "https://www.aviasales.com/search/OTP1709RMO20091"
    return decoded.replace(/^https?:\/\//, "").replace(/^www\./, ""); // убираем https://
  } catch (e) {
    console.error("extractShortLink error:", e);
    return null;
  }
}

module.exports = { extractShortLink };

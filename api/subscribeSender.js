import { subscribeSender } from "../bot/subscribe/sender";

export default async function handler(req, res) {
  try {
    await subscribeSender();
    res.status(200).json({ ok: true, message: "Flights posted" });
  } catch (err) {
    console.error("Cron error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

import { TopForTodayRomania } from "../channels/channelRomania/index";
import { TopForTodayItaly } from "../channels/channelItaly/index";

export default async function handler(req, res) {
  try {
    await TopForTodayRomania();
    await TopForTodayItaly();
    res.status(200).json({ ok: true, message: "Flights posted" });
  } catch (err) {
    console.error("Cron error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}

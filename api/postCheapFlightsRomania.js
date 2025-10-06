// pages/api/run-task.js
import { exec } from "child_process";
import path from "path";

export default async function handler(req, res) {
  try {
    // путь к твоему JS-файлу (например, в папке scripts)
    const filePath = path.join(process.cwd(), "api", "postCheapFlights.js");

    exec(`node ${filePath}`, (error, stdout, stderr) => {
      if (error) {
        console.error("Ошибка выполнения:", error);
        return res.status(500).json({ success: false, error: error.message });
      }
      if (stderr) {
        console.error("stderr:", stderr);
      }
      console.log("stdout:", stdout);
      return res.status(200).json({ success: true, output: stdout });
    });
  } catch (err) {
    console.error("Ошибка в API:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

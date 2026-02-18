# ✈️ Cheap Flights Bot

<p align="center">
  <b>Intelligent Telegram Bot for Finding the Cheapest Flights</b><br>
        This is a small part of main project ToTheTrip.<br>
  Automated deal discovery • AI-generated headlines • Multi-channel publishing
</p>

> 🚧 **Project Status: Early Development (≈90% complete)**  
> Main part tothetrip.app: https://github.com/aemorozov/toTheTrip<br>

---

## 🚀 Overview

**Cheap Flights Bot** is an advanced Telegram bot built with **Node.js** that helps users find the cheapest flight deals and automatically publishes the best offers to multiple Telegram channels.

The system combines:

- ✈️ Flight data via Travel APIs  
- 🤖 AI-generated headlines  
- 📊 Custom deal scoring algorithm  
- 🖼 Automated visual content  
- 🔄 Scheduled CRON automation  
- ⚡ Redis-based state management  

---

## 📌 Features

### 👤 Telegram User Bot

Users can:

- 🔟 Get the **10 cheapest flights**
- 🎯 Search by specific destination
- 📅 Check flights for selected dates
- 🏖 Discover weekend trips
- 💎 View special flight deals

When a user presses `/start`, their profile is automatically stored in Redis:

```json
{
  "id": 51053108695,
  "first_name": "Sergej",
  "language_code": "de",
  "iata_code": "CGN",
  "city": "Cologne",
  "destination_iata": "",
  "one_way": null,
  "step": "no_step",
  "messages": [],
  "updated_at": "2026-02-15T06:55:28.198Z"
}
```
---

## ✈️ Flight Search Engine

Flight data is retrieved using the **Travelpayouts API**.

The system fetches:

- Cheapest flights  
- Country-based deals  
- Special promotions  
- Date-specific prices  
- Raw pricing data for analytics  

---

## 🤖 AI-Powered Headlines

For Telegram channels, the bot:

- Collects raw flight data  
- Calculates a **deal attractiveness score**  
- Selects the best routes  
- Generates engaging headlines using **OpenAI API**
- Get real pictures from **Pixeles API**
- Publishes automatically with CRON

**Result:** high-engagement travel content, fully automated.

---

## 📢 Multi-Channel Automation

The bot manages **10+ Telegram channels**.

CRON jobs handle:

- 🔄 Scheduled deal collection  
- 📊 Flight analysis  
- 🧮 Scoring algorithm execution  
- 📝 Headline generation  
- 🚀 Auto-posting to channels  

Everything runs without manual intervention.

---

## 🖼 Visual Content

Images for posts are sourced automatically using the **Pexels API** to improve click-through rate and engagement.

---

## 🏗 Architecture

```bash
toTheTrip/
│
├── bot/ # Telegram bot logic
├── api/ # External API integrations
└── channels/ # Channel management & posting
```

---

## 🛠 Tech Stack

- Node.js
- JavaScript
- Redis
- Telegram Bot API
- Travelpayouts API
- OpenAI API
- Pexels API
- CRON

---

## 🔄 Automation

CRON jobs power:
- Scheduled flight monitoring
- Subscriber notifications
- Channel publishing
- Price tracking
- Content updates

---

## 💡 Key Highlights

- Fully automated travel deal engine
- AI-powered content generation
- Custom flight scoring algorithm
- Scalable multi-channel architecture
- Multilingual support
- Advanced date normalization


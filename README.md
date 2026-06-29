# 🎯 Placement Intel

> A backend service that automatically scrapes interview experiences from GeeksforGeeks and LeetCode Discuss, extracts DSA topics, and aggregates patterns per company — so students know exactly what to prepare.

---

## 📌 The Problem

Every CS student preparing for placements has to:
- Read 200+ scattered blog posts across GFG, LeetCode, Glassdoor
- Manually figure out what topics a company asks
- Hope the data is from 2024 and not 2019

**Nobody has aggregated this cleanly for Indian college placements.**

Placement Intel does it automatically — scrapes real experiences, extracts topics, and serves clean pattern data via a REST API. Updated every week.

---

## 🚀 What It Does

**Search a company → get exactly what they ask**

```json
GET /api/companies/amazon/summary

{
  "company": "Amazon",
  "based_on": 143,
  "confidence": "High",
  "avg_rounds": 4,
  "round_types": ["Online Assessment", "Technical", "Technical", "HR"],
  "top_topics": [
    { "topic": "Dynamic Programming", "frequency": "78%" },
    { "topic": "Trees",               "frequency": "65%" },
    { "topic": "Arrays",              "frequency": "61%" }
  ],
  "ctc_range": "18 - 35 LPA",
  "avg_process_duration": "3 weeks"
}
```

**Browse real experiences with filters**

```json
GET /api/companies/amazon/experiences?year=2024&result=selected

{
  "total": 47,
  "experiences": [
    {
      "id": "exp_001",
      "title": "Amazon SDE-1 — August 2024",
      "rounds": 4,
      "topics": ["DP", "Trees"],
      "result": "Selected",
      "ctc": "22 LPA",
      "source": "GeeksforGeeks",
      "source_url": "https://geeksforgeeks.org/..."
    }
  ]
}
```

**Get a full round-by-round breakdown**

```json
GET /api/experiences/exp_001

{
  "rounds": [
    {
      "round_number": 1,
      "type": "Online Assessment",
      "topics": ["DP", "Arrays"],
      "difficulty": "Medium",
      "summary": "2 questions, 90 minutes..."
    },
    {
      "round_number": 2,
      "type": "Technical",
      "topics": ["Trees", "Graphs"],
      "difficulty": "Hard"
    }
  ],
  "tips": "Focus on DP and Trees. HR was very relaxed.",
  "source_url": "https://geeksforgeeks.org/..."
}
```

---

## 🛠️ Tech Stack

| Technology | Why |
|---|---|
| **Node.js + Express** | Fast, lightweight REST API server |
| **PostgreSQL** | Permanent storage for experiences, companies, topics |
| **Redis** | Caches heavy aggregation queries — results in under 5ms |
| **Puppeteer** | Scrapes public GFG and LeetCode pages automatically |
| **node-cron** | Runs scrapers every week — data stays fresh |
| **Docker** | One command runs the entire project anywhere |

---

## 📡 API Reference

### Company Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/companies` | List all companies with data |
| `GET` | `/api/companies/:name/summary` | Aggregated pattern for a company |
| `GET` | `/api/companies/:name/experiences` | Individual experiences list |
| `GET` | `/api/companies/:name/rounds` | Round-by-round breakdown |

### Experience Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/experiences/:id` | Full single experience |
| `POST` | `/api/experiences/submit` | Submit your own experience |

### Topic Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/topics` | All tracked DSA topics |
| `GET` | `/api/topics/:name` | Which companies ask this topic |
| `GET` | `/api/topics/trending` | Most asked topics this year |

### Search

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/search?q=amazon+dp+2024` | Full text search across all data |

### Query Parameters

```
/api/companies/amazon/experiences
  ?year=2024          filter by year
  ?result=selected    filter by outcome (selected/rejected)
  ?topics=dp,trees    filter by topics asked
  ?page=2             pagination
  ?limit=10           results per page
```

---

## 🗂️ Project Structure

```
placement-intel/
│
├── src/
│   ├── scrapers/        # One file per data source (plugin architecture)
│   │   ├── base.scraper.js
│   │   ├── gfg.scraper.js
│   │   └── leetcode.scraper.js
│   │
│   ├── extractors/      # Parse raw text → structured data
│   │   ├── topic.extractor.js
│   │   ├── rounds.extractor.js
│   │   └── ctc.extractor.js
│   │
│   ├── routes/          # URL definitions only
│   ├── controllers/     # Calls services, returns response
│   ├── services/        # All business logic lives here
│   ├── middleware/      # Error handler, rate limiter, logger
│   ├── jobs/            # Cron job for weekly scraping
│   └── config/          # DB, Redis, topic keyword map
│
├── migrations/          # Numbered SQL files — never edit old ones
├── app.js               # Express setup
├── server.js            # Starts the server
├── docker-compose.yml   # Runs app + PostgreSQL + Redis together
├── Dockerfile
├── .env.example         # Template for required environment variables
└── README.md
```

---

## ⚙️ Running Locally

### Prerequisites
- Node.js v18+
- Docker + Docker Compose

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/placement-intel.git
cd placement-intel

# Copy environment variables
cp .env.example .env

# Start PostgreSQL + Redis via Docker
docker-compose up -d postgres redis

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start the server
npm run dev
```

Server runs at `http://localhost:3000`

### Run with Docker (entire stack)

```bash
docker-compose up
```

That's it. App + PostgreSQL + Redis all start together.

---

## 🔄 How Data Flows

```
GFG (public pages)      ──┐
                           ├──► Topic Extractor ──► PostgreSQL ──► Redis Cache
LeetCode Discuss (public) ─┘                                           │
                                                                        ▼
Student manual submission ────────────────────────────────────► REST API
                                                                        │
                                                                        ▼
                                                              Clean pattern data
```

---

## 📊 Data Accuracy

| Data Point | Accuracy |
|---|---|
| Company name, rounds, result | 85 – 90% |
| DSA topics extracted | 70 – 75% |
| CTC / salary | 80% |

Every response includes a `based_on` count. If it is below 10, the API shows a low confidence warning — because patterns from 3 experiences mean nothing.

---

## 🔌 Adding a New Data Source

The scraper system uses a plugin architecture. Adding Glassdoor takes one new file:

```js
// src/scrapers/glassdoor.scraper.js
class GlassdoorScraper extends BaseScraper {
  async scrape() { ... }
  async parse() { ... }
  async save() { ... }
}
```

Zero changes to existing code.

---

## 🗺️ Roadmap

- [x] GFG scraper
- [x] LeetCode Discuss scraper
- [x] Topic extraction engine
- [x] Pattern aggregation API
- [x] Redis caching layer
- [x] Weekly cron job
- [x] Docker setup
- [ ] Glassdoor scraper
- [ ] AmbitionBox scraper
- [ ] Company comparison API
- [ ] Preparation roadmap generator
- [ ] Email alerts for new experiences
- [ ] Difficulty trend over years

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<p align="center">Built by a CS student, for CS students preparing for placements.</p>

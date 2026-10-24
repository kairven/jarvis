# 🛠️ J.A.R.V.I.S. Tool Belt — 21 live tools, zero keys, zero signup

Your assistant used to be able to *talk*. Now it can **act**.

Every tool below is **free, keyless and runs in your browser** (except `device`, which
talks to your own `agent.py`). No accounts, no API keys, no servers of mine in the middle.

---

## How it works

1. You ask something that needs live or exact data.
2. JARVIS decides to use a tool and writes it on its own line:

   ```
   [TOOL: weather Kanpur]
   ```

3. The app **executes it right there**, shows you a chip (`🌦️ weather ✓ 412ms`),
   then hands the real result back to the model, which writes the final answer.
4. Up to **3 tools per reply, 4 rounds deep** — it can chain them
   (read a page → then summarise it).

Every run is logged in the **🛠️ TOOLS** tab with its input, output and latency.
You can switch any tool off, and you can always call one directly:

```
/weather Kanpur          /calc 18% of 4500        /github facebook/react
/news AI agents          /crypto btc              /papers attention is all you need
/read https://example.com /define serendipity     /translate hindi: good morning
/qr https://yoursite.com  /random password 24     /timer 10m tea
/tools                   /tool weather Mumbai
```

---

## The arsenal

| Tool | What it does | Source (free, keyless) |
|---|---|---|
| 🔢 `calc` | Exact arithmetic, %, powers, roots, trig — a real parser, never a guess | built in (no `eval`) |
| 📐 `units` | Length, mass, time, data, speed, area, volume, °C/°F/K | built in |
| 🕒 `time` | Time & date in any city / IANA timezone | built in (Intl) |
| 🌦️ `weather` | Current conditions + 3-day forecast, any city | Open-Meteo |
| 💱 `forex` | Live FX rates, 160+ currencies | open.er-api.com |
| 🪙 `crypto` | BTC/ETH/SOL… in USD **and** INR, with 24h change | CoinGecko |
| 📖 `wiki` | Encyclopedic summaries with source link | Wikipedia REST |
| 🔎 `search` | Live web results with cited links | Wikipedia + DuckDuckGo |
| 📰 `news` | What the tech world is discussing now | Hacker News (Algolia) |
| 🐙 `github` | Stars, forks, language, licence, activity of any repo | GitHub API |
| 🎓 `papers` | Most-cited research on any topic (250M works) | OpenAlex |
| 📕 `define` | Definitions + phonetics | freeDictionaryAPI |
| 🌐 `translate` | Hindi, Tamil, Telugu, Urdu, French, Japanese… | MyMemory |
| 📄 `read` | Fetch any URL as clean text, then reason over it | jina-ai/reader |
| 🔳 `qr` | QR codes rendered right in the chat | qrserver |
| 🎲 `random` | Dice, coins, UUIDs, strong local passwords | built in (crypto RNG) |
| ⏱️ `timer` | Countdown that alerts + speaks when it fires | built in |
| 🧠 `remember` | JARVIS saves a durable fact straight into the Mind | built in |
| ⚙️ `task` | Logs a commitment the Operator tracks forever | built in |
| 🎨 `imagine` | Image generation | Pollinations / Flux |
| 🎛️ `device` | Volume, battery, torch, screenshot, notifications… | your `agent.py` |

---

## 🧩 Which data is worth sending (context engineering)

Inspired by **[ratel-ai/ratel](https://github.com/ratel-ai/ratel)** — *"your agent is paying
for tools it never uses"*. The short version: **send the smallest set of high-signal data,
not everything you own.**

| Data | Rule | Budget |
|---|---|---|
| Memory facts | top 12 by **BM25** relevance to your question; the 6 freshest if nothing matches | 1,500 chars |
| Open commitments | top 6 by relevance, trimmed to 110 chars each | 700 chars |
| Your documents | BM25 with a **relevance floor** — an unrelated question pulls in nothing | 2,200 chars |
| Tool descriptions | **progressive disclosure**: 6 described in full per turn, all 22 listed by id | 6 tools |
| Conversation | newest-first until the budget is spent, not "last 13 messages" | 5,000 chars |

Measured on a realistic long-term user (60 facts, 15 tasks, 5 docs):

```
before:  3,224 tokens of fixed overhead every turn
after :  1,327 for "what's the weather in Kanpur"   (−59%)
         1,071 for "hello"                          (−67%)
```

Nothing is lost: the full catalogue is one `[TOOL: tools]` call away, and the
**🧩 WHAT I SEND TO THE AI** panel in the TOOLS tab shows exactly what was included,
what was held back, how many tokens it cost, and whether storage is actually saving.
That panel is the honest answer to *"which data is useful when I use the AI"* — for
*your* data, on *your* device.

---

## Open-source repos this is built on

**Already integrated (running in your browser):**

| Repo | Powers |
|---|---|
| [pollinations/pollinations](https://github.com/pollinations/pollinations) | free LLM + Flux image engine |
| [mozilla/pdf.js](https://github.com/mozilla/pdf.js) | drop a PDF into KNOWLEDGE → it becomes searchable memory |
| [open-meteo/open-meteo](https://github.com/open-meteo/open-meteo) | weather and geocoding |
| [jina-ai/reader](https://github.com/jina-ai/reader) | `/read` — any URL as clean text |
| [HackerNews/API](https://github.com/HackerNews/API) | tech news |
| [meetDeveloper/freeDictionaryAPI](https://github.com/meetDeveloper/freeDictionaryAPI) | dictionary |
| [ratel-ai/ratel](https://github.com/ratel-ai/ratel) | the context-selection design: progressive disclosure, BM25, no vector DB |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | the audit lens: every finding needs a concrete case; lean beats clever |

**The honest upgrade path (needs a computer or a server, not a browser tab):**

| Repo | What it unlocks | Why it's not in yet |
|---|---|---|
| [ollama/ollama](https://github.com/ollama/ollama) | a private brain running on your own machine | needs a real machine with RAM |
| [tesseract.js](https://github.com/naptha/tesseract.js) | OCR — photograph a document, JARVIS reads it | ~15 MB model download |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | local speech-to-text, no cloud | already wired into `agent.py --hf-token` |
| [n8n-io/n8n](https://github.com/n8n-io/n8n) | real automation: email, sheets, webhooks, schedules | needs a running service |
| [mem0ai/mem0](https://github.com/mem0ai/mem0) | proper long-term memory instead of localStorage | needs an API/DB |
| [searxng/searxng](https://github.com/searxng/searxng) | self-hosted search, no rate limits | needs hosting |

---

## Honest limits

- **Rate limits:** GitHub allows 60 lookups/hour without a token; CoinGecko and
  DuckDuckGo throttle heavy use. JARVIS reports the failure instead of inventing an answer.
- **CORS:** a few sites block the page reader. When that happens you get a clear error, not a fake summary.
- **PDF without text:** scanned PDFs need OCR — that is the `tesseract.js` upgrade above.
- **PDF.js loads from a CDN** on first use. Offline, text notes and everything else still work.
- **No tool ever runs without you seeing it** — every call appears as a chip in the chat
  and in the TOOLS tab log.

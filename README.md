# 🤖 J.A.R.V.I.S. MK-II — Setup Guide
### The personal AI of Mohd Sameer Khan

### 🟢 LIVE → **https://kairven.github.io/jarvis/**

Open that link on any device — nothing to install. On a phone: open it in Chrome →
menu → **Add to Home Screen** → JARVIS launches full-screen like a native app.

> **First time only:** if that link is not live yet, flip one switch —
> **Settings → Pages → Build and deployment → Source: “GitHub Actions”**.
> The included workflow (`.github/workflows/pages.yml`) then publishes the app on
> every push to `main`. No build step, no config.

One file. No installation. No programming. Free forever.

---

## ⚡ Quick Start — MacBook (Late 2012)

Your MacBook can't run AI models itself (no GPU) — so JARVIS's **brain runs free in the cloud** and your Mac only needs a browser. It will run fast even on 2012 hardware.

1. **Download the whole `jarvis` folder** (index.html + manifest.json + sw.js + icons) to your MacBook.
2. **Open `index.html` in Chrome or Firefox** (double-click it). Don't use old Safari.
   - Max macOS for your model is **Catalina (10.15)**. On Catalina, install **Mozilla Firefox ESR** (free, still updated) — best choice.
3. **That's it — JARVIS works immediately.** The default **FREE BRAIN** needs no account, no key, no card.
4. Optional (more power, still free): add backup brains in **⚙️ SETUP** — a **Hugging Face** token (huggingface.co → Settings → Access Tokens) and/or a **Groq** key (console.groq.com). JARVIS auto-switches brains if one fails.
5. Press **🔎 TEST ALL BRAINS**, then go to **💬 CHAT** and say: *"JARVIS, introduce yourself."*

---

## 📱 Phone Setup (use it ANYWHERE)

Best way = **GitHub Pages** (free hosting, 10 minutes, one-time):

1. Create a free account at **github.com**
2. Click **+** (top right) → **New repository** → name it `jarvis` → set it **Public** → Create
3. Click **uploading an existing file** → drag in **ALL the files** (`index.html`, `manifest.json`, `sw.js`, and the `icons` folder) → **Commit changes**
4. In the repo: **Settings → Pages** → under "Branch" choose **main** → Save
5. Wait ~2 minutes → your AI is now live at:
   `https://YOUR-USERNAME.github.io/jarvis/`
6. Open that link in Chrome on your phone → **Chrome menu → "Add to Home Screen"** →
   you now have a real **JARVIS app icon** that launches full-screen like a native app 🚀
   (and it keeps working offline — the service worker caches the app)

Your memories stay in each device's browser (they don't sync automatically — use SETUP → **EXPORT BACKUP** / **IMPORT** to move your Mind between devices).

---

## 🎙️ Voice

| Device | Voice input (you → JARVIS) | Voice output (JARVIS → you) |
|---|---|---|
| Phone (Chrome) | ✅ tap 🎙️ | ✅ enable in SETUP |
| MacBook (Firefox/Chrome) | ⚠️ depends on browser version | ✅ |

Voice output uses the built-in system voice — enable it in **SETUP → Behaviour → Voice output**.

---

## 💬 What JARVIS Can Do — Command Reference

| Say this | What happens |
|---|---|
| `/tools` | Lists the full 21-tool belt (and lets you call any of them) |
| `/weather Kanpur` | Live weather + 3-day forecast, any city |
| `/calc 18% of 4500` | Exact math — percentages, powers, roots, trig |
| `/github facebook/react` | Stars, forks, licence, activity of any repo |
| `/read https://example.com` | Reads any web page, then summarises it |
| `/search best budget laptop 2026` | Searches the web live, structures the findings with sources |
| `/imagine a neon cyberpunk arc reactor` | Generates an AI image (Flux — free, no account) |
| `/brief` | Daily Operator brief: your tasks, focus, opportunity, risk |
| `/status` | Full system diagnostic |
| `/task register the business name` | Operator logs your commitment, tracks it in every chat |
| `/done 1` | Mark task #1 complete |
| `remember my sister's birthday is 5 June` | Stored in the Mind — used in ALL future chats |
| `/security harden my macbook` | Defensive security plan for YOUR devices |
| `/security 6-month ethical hacker study plan` | Legal white-hat career path |
| `/learn` | JARVIS re-reads recent chat and extracts new facts about you |
| `/clear` | Wipes the conversation (Mind is kept) |

---

## 🛠️ The Tool Belt — 21 live tools, zero keys

JARVIS no longer just talks. He **acts**, and he decides when — mid-thought.

```
You:  "JARVIS, what's the weather in Kanpur, and what's BTC at right now?"
JARVIS: [TOOL: weather Kanpur]
        [TOOL: crypto btc]
        → the app runs both live → he answers with the real numbers
```

| Category | Tools |
|---|---|
| Live data | weather · forex · crypto · news · search · wiki |
| Exactness | calc · units · time · random |
| Research | papers · github · define · translate · read |
| Action | qr · timer · remember · task · imagine · device |

Every call shows as a chip in the chat (`🌦️ weather ✓ 412ms`) and is logged with its
output in the **🛠️ TOOLS** tab — you can switch any of them off, or press **TRY** to
run one by hand. The full catalogue, the open-source repos behind it, and the honest
limits are in **[TOOLS.md](TOOLS.md)**.

Also new: **drop a PDF or text file into KNOWLEDGE** and it is extracted on your device
(Mozilla pdf.js) and becomes part of JARVIS's searchable memory.

### ⚡ v4.1 — speed and resilience

| Feature | Effect |
|---|---|
| **TTL cache** (persistent) | repeat questions answer instantly; crypto 2 min, weather 10 min, wiki/papers 1–7 days. Side effects (timer, remember, task, device, random) are never cached |
| **Retry with back-off** | one automatic retry on network/429/5xx faults — skipped when you are known-offline |
| **Graceful degradation** | if a live fetch fails, the last cached value is shown **labelled as stale with its age**, never an invented number |
| **🩺 Diagnostic** | TOOLS → RUN FULL DIAGNOSTIC reports pass/fail, avg + p95 latency and the slowest tool |
| **Telemetry** | per-tool calls, success %, cache hits and average latency, plus a session KPI strip |
| **HOME CITY** | `/weather` and `/time` default to your city instead of asking |

Full reasoning — including which parts of the usual "supercharge" advice do *not* apply to a
single-file PWA — is in **[SUPERCHARGE.md](SUPERCHARGE.md)**.

---

**Auto-Learn** (default ON): after every conversation, JARVIS silently extracts durable facts about you and saves them. **This is its self-training** — it gets smarter about your life every single day, and you can audit everything in the **🧠 MIND** tab.

### The Board of Advisors (default ON)
For every important answer you get three extra perspectives:
- **⚙️ Operator** — turns your decision into exact actions, steps, deadlines
- **💡 Innovator** — finds opportunities *beyond* the current reality of your business
- **⚔️ Challenger** — exposes your assumptions and risks, directly

Turn it off in SETUP for casual chat.

---

## 🛡️ The Security Rule (please read once)

JARVIS **defends** — your MacBook, your phone, your accounts, your network — and teaches you **legal** ethical hacking (picoCTF → TryHackMe → OSCP; professionals earn ₹10–50 LPA).

It will never attack systems you don't own. Unauthorised access is a crime under the **IT Act 2000 (§43, §66)** everywhere in the world, and "but my AI did it" protects nobody. The white-hat path is both legal *and* the one that pays.

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| "Network blocked" in the in-app preview | Normal — the preview sandbox has no internet. Download the folder and open in a real browser |
| **Groq is not working** | Ignore it — Groq is *optional* now. The FREE brain needs nothing at all. Or add a free Hugging Face token instead |
| "HF ✗" in TEST ALL BRAINS | Token must start with `hf_` — create a **Fine-grained token** and tick "Make calls to Inference Providers" |
| "Model decommissioned / not found" | Retired model — change it in SETUP (dropdown for Groq, model field for HF), or press TEST ALL BRAINS |
| Free brain answers feel simple | Add a Hugging Face token — JARVIS automatically prefers it when present |
| Replies feel slow | Free brain at peak load — add HF/Groq backup brains and JARVIS auto-switches |
| Lost memories after reinstalling browser | Use SETUP → EXPORT BACKUP weekly — make it a habit |
| A tool says "HTTP 403/429" | That service is rate-limiting. GitHub allows 60 lookups/hour without a token; wait or use another tool |
| `/read` fails on a site | That page blocks readers (CORS/paywall) — paste the text instead, or add it in KNOWLEDGE |
| "pdf.js failed to load" | The CDN was blocked/offline. Text and MD files still work; PDFs need one online load |

---

## 📈 What's next?

Open **ROADMAP.md** — the plan to grow this into a full superintelligent system: real automation, Hugging Face, training on your own data, and the honest truth about self-improving AI.

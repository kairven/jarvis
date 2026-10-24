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

### 🧩 v4.2 — it now decides what is worth remembering to send

JARVIS no longer dumps every fact it has into every question. Memory, tasks, documents,
tool descriptions and chat history are ranked by relevance (**BM25**) against what you
just asked and cut to a budget.

```
before: 3,224 tokens of fixed overhead every turn
after : 1,327 for "what's the weather in Kanpur"   (−59%)
```

The **🧩 WHAT I SEND TO THE AI** panel in the TOOLS tab shows the last decision: what went
in, what was held back, tokens spent, and whether your data is actually being saved.
A full code audit (4 real bugs found and fixed, including silent data loss when browser
storage fills up) is in **[AUDIT.md](AUDIT.md)**.

### 🎓 v4.3 — taught: 18 skills + 12 reference notes on transformer models (now 22)

I cannot copy a model's weights into a browser file — nobody can. What transfers is
**procedure and reference knowledge, delivered when relevant**, and that is what this adds.

| | What |
|---|---|
| **22 skills** | debugging, code review, architecture, testing, writing, studying, business, money, marketing, negotiation, decisions, security, prompt engineering, learning AI, research, interviews, explaining, data analysis, selling abroad, leak audits, SOWs, cold-outreach law — each a *procedure*, injected only when your message matches |
| **12 teachings** | how transformers, tokens, embeddings, RAG, fine-tuning, agents, evaluation, hallucination, local models, latency, language fairness and the AI learning path actually work |
| **Teach it yourself** | `/teach <rule>` — your knowledge, retrieved when relevant, deletable any time |

Costs nothing until needed: all 22 skills are ~10 KB on disk but at most **1,500 characters**
per turn, and *"what's the weather in Kanpur"* injects **no skill at all**.

```
/skills      list everything
/skill debug force one
/teach ...   your own rules
```

Details, honest limits and sizes: **[SKILLS.md](SKILLS.md)**.

### 🔧 v4.6 — the free brain that stopped answering, fixed at the root

Three separate failures, three root causes. None of them were "the AI is bad".

**1. `⚠️ System fault: FREE BRAIN (Pollinations): empty/malformed response`**

Pollinations moved to a unified API (`gen.pollinations.ai`) and put the old one in
maintenance mode. The app was calling `text.pollinations.ai/openai`, which now answers
with a payload that has no `choices` — so the parser reported *"empty/malformed"* and
the GET fallback, which encoded a 2,400-character prompt into the URL and appended
a `?model=` that no longer exists, came back **404**.

| Before | After |
|---|---|
| `POST /openai` (deprecated) | `POST /v1/chat/completions` (current) |
| model `openai` | model `openai-fast` — the only one the free tier still lists |
| fallback URL ≈ 2,400 chars → 404 | capped at 900 chars, no `model` param |
| `empty/malformed response` | the provider's own words, quoted, plus a host name |
| "System fault" dump | a diagnosis + `/retry`, `/brain`, and what to do next |

It also now remembers **what each brain actually said**, per brain, with a timestamp —
`/brain` reports that instead of guessing.

**2. "search about kairven" → "Kairven is a typical fantasy name"**

The search path went through one proxy (`r.jina.ai`), which rate-limits anonymous
traffic. It failed, and the model filled the silence with a confident invention.

Now: three independent proxy routes with fail-over, the reason each one failed is kept,
and if **nothing** comes back the app answers instead of the model —
*"No live results for 'kairven' — and I will not guess what it is."* The master prompt
gained one hard rule: **no result is a result.**

**3. "when I say hey jarvis you wake up" → "install PyAudio and a USB microphone"**

The cloud brain was asked about the browser it was running inside. It cannot see that,
so it invented a Python console app and a tutorial to match — while the real app already
had a working wake word one button away.

Questions about JARVIS itself are now answered **by JARVIS**, before any brain is called:

| You say | The app answers, not the model |
|---|---|
| "when I say hey jarvis you wake up" | the exact 💤 steps and the five reasons it fails |
| "active voice command" | the browser's Web Speech API — no installs, ever |
| "why is your voice not working" | a live check: engine, https, iframe, permission |
| "check brain is working or not" | `/brain` — a real table of every provider |
| "why system fail" | the actual last error, quoted |
| "I don't like your accent" | `/accent` — five accents, applied immediately |

**New commands:** `/accent british|indian|american|australian|neutral` · `/accent list`
(every voice the device actually has) · `/brain` · `/retry`. There is also an **ACCENT**
dropdown in ⚙️ SETUP, and the accent sets speech recognition to match.

**168 assertions across 8 suites**, including the exact six sentences from the failure
report above. `sw.js` → `jarvis-mk2-v13` — **hard-refresh once** (Ctrl/Cmd-Shift-R) if the
old build is still cached.

### 🌍 v4.5 — the international client kit

The business question stopped being *"what can the AI do"* and became *"how does it earn"*.
Two answers, both deterministic — no model call, no token cost:

| Command | What you get |
|---|---|
| `/leak <business>` | A nine-check public audit worksheet: call twice, check voicemail, WhatsApp Business, booking path, after-hours reply, Google listing, review velocity, mobile speed, real proof — each with the pass/fail rule, a scoring band, and the three-line email to send afterwards |
| `/proposal <client> \| <problem>` | A complete SOW in four currencies (AED / £ / $ / ₹), with every number you cannot know left as a `[bracket]` and a warning to delete them |

Plus four procedures that load only when relevant: **selling abroad** (choose the market
by timezone overlap and payment rails, not by size), **leak audit**, **proposals & SOW**,
and **cold outreach law** (PECR, CAN-SPAM, CASL, DPDP — including the markets where cold
email is simply not allowed).

The full playbook — market ranking with the clock arithmetic, pricing anchors, the
14-day launch calendar, the three emails, payment rails and the legal matrix — is in
**[INTL.md](INTL.md)**.

### 🎙️ v4.4 — "hey jarvis" wake word, and real-time data that actually works

**Voice was broken in three specific ways, all fixed:**
1. Recognition stopped after one phrase and **never restarted** — so a wake word was impossible.
2. Errors were swallowed, so a blocked microphone looked like a dead button.
3. It never told you Web Speech needs **Chrome/Edge over https:// or localhost**.

Now: tap 🎙️ for one phrase, or 💤 to wait for **"hey jarvis"**. It listens continuously,
restarts itself when Chrome ends the session, shows interim text, ignores its own voice
(no echo loop), and returns to sleep after 12 seconds of silence. Errors are readable —
"Microphone blocked. Click the padlock → Site settings → Microphone → Allow."
`/voice` prints a full status table. Languages: English (India/US/UK), हिन्दी, தமிழ், తెలుగు, मराठी, বাংলা.

**"Unable to search real-time stats" had a concrete cause:** the search tool was querying
DuckDuckGo's *instant-answer* API, which answers trivia questions and returns **nothing**
for "current price of bitcoin". It never was a search engine.

Now there are two fixes:
- `doSearch` fetches a **real results page** (DuckDuckGo HTML, via a CORS-friendly reader), with Wikipedia and instant answers as supplements.
- **AUTO LIVE**: for weather / crypto / forex / news questions, JARVIS fetches the real numbers
  **before** the model speaks and hands them over. You no longer depend on a small free brain
  deciding to call a tool — the data is simply there.

```
You:  "hey jarvis, what's bitcoin at?"
      → 📡 Fetched live data → answer with the real price, not a guess
```

And in ⚙️ SETUP, **TEST ALL BRAINS** now prints *why* a brain failed (401 vs 429 vs CORS vs
retired model), with a separate **live data** check — because your API key powers thinking,
while weather/prices come from the tool belt, which needs no key at all.

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

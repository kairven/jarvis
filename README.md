# 🤖 J.A.R.V.I.S. MK-II — Setup Guide
### The personal AI of Mohd Sameer Khan

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

---

## 📈 What's next?

Open **ROADMAP.md** — the plan to grow this into a full superintelligent system: real automation, Hugging Face, training on your own data, and the honest truth about self-improving AI.

# 🚀 J.A.R.V.I.S. MK-II — Master Roadmap
### From working prototype → superintelligent personal AI

Built for **Mohd Sameer Khan**. Honest engineering, movie-grade ambition.

---

## ✅ PHASE 0 — DONE (today)
- [x] Working JARVIS brain — **8 free LLM brains with automatic failover**: Pollinations (zero signup) → Gemini → Groq → OpenRouter → Mistral → Cohere → Cerebras → Hugging Face
- [x] **Agent loop** — JARVIS can summon `[SEARCH]` and `[IMAGE]` tools mid-thought, then answer with the results (plan → act → answer)
- [x] **Image engine** — `/imagine <description>` generates AI images via Flux, free, no account
- [x] **Master Prompt editor** — the full engineered system prompt is visible & editable (SETUP → STEP 4; see PROMPTS.md)
- [x] **Routing** — ⚡ AUTO (fast brains first) vs 🧪 DEEP (strongest brains + visible ⚡Reasoning section)
- [x] Voice in/out, works on phone + 2012 MacBook
- [x] **Mind** — persistent memory that grows every day (auto-learning)
- [x] **Knowledge Base** — feed it your notes, it uses them automatically
- [x] **Board of Advisors** — ⚙️Operator / 💡Innovator / ⚔️Challenger
- [x] **Operator tracker** — decisions → tasks → results
- [x] **Security Division** — defensive security only, legal white-hat path
- [x] Installable as a real **app** on phone & laptop (PWA: manifest + service worker + generated icons)
- [x] Voice in/out, works on phone + 2012 MacBook
- [x] **Mind** — persistent memory that grows every day (auto-learning)
- [x] **Knowledge Base** — feed it your notes, it uses them automatically
- [x] **Board of Advisors** — ⚙️Operator / 💡Innovator / ⚔️Challenger
- [x] **Operator tracker** — decisions → tasks → results
- [x] Live web search, structured answers, daily briefs
- [x] **Security Division** — defensive security only, legal white-hat path

---

## 🧠 PHASE 1 — Make it learn FASTER (this month)
Goal: deeper self-training, still free.

1. **Feed it everything.** Paste into the Knowledge Base:
   - your business plans, study notes, WhatsApp-exported important chats
   - one page per document — 20–30 documents and it starts to feel *scary* smart
2. **Weekly ritual:** every Sunday press **🧠 Learn From Chat** and review the MIND tab. Correct wrong facts. This is literally training your model.
3. **Upgrade the search:** the current search uses free Wikipedia + DuckDuckGo. Next level: a free **Tavily** or **Serper** API key (both have free tiers) for real Google-grade results — I can wire it in when you're ready.
4. **Better voice:** install a free neural voice for more "movie Jarvis" speech.

---

## 🦾 PHASE 2 — Real Automation ("do things, not just talk")
### ✅ DELIVERED: JARVIS Device Agent v1.1 (`agent/agent.py`)
Zero-dependency Python agent = JARVIS's **hands**. Runs on your 2012 MacBook (stock Python), Android/Termux, any Linux. Token-authenticated, allowlist-only (free shell refused by default — tested with `rm -rf /`). Full guide: `agent/README-AGENT.md`.
- **CONTROL tab** in the app: ping, status, battery, volume, screenshot, open, speak, notify, torch, terminal log
- **`/run <action>`** chat command → executes on the connected device
- **`[DEVICE:]` AI tool** — the cloud LLM *itself* decides to control your devices mid-conversation
- **Hugging Face Whisper** (`whisper-large-v3-turbo`, free) speech-to-text via the agent
- **v1.1:** 📧 Gmail send/read (app-password, stdlib) · 💬 Telegram alerts (own bot, stdlib) · 📄 PDF extraction (pypdf) — all free, graceful setup guidance when unconfigured
- **🕸️ Knowledge Map (graph-lite)** in the MIND tab: `#tags` + `[[wiki-links]]`, clickable SVG map clustered around YOU, tag filter chips — the "knowledge graph" with zero external tools
- These files are **your first GitHub repo** — push them (steps in agent/README-AGENT.md)

Next repos when you're ready:

| Repo | What it gives JARVIS | Runs on 2012 MacBook? |
|---|---|---|
| **n8n** (n8n.io, self-hosted) | Visual automation: JARVIS triggers → sends emails, posts, saves files, monitors things | ⚠️ Borderline (8GB RAM) — or use n8n free cloud |
| **browser-use** | An AI agent that actually operates a web browser (fills forms, clicks, scrapes) | ⚠️ Needs modern machine; free tier of cloud alternatives exist |
| **whisper.cpp** | Best-in-class speech-to-text, fully offline | ✅ Yes (tiny/base models) |
| **LangChain / LlamaIndex** | The standard frameworks for agent + memory + tools | ✅ Yes (it just calls cloud APIs) |
| **AutoGPT / CrewAI** | Multi-agent swarms: give a goal, agents plan and execute | ✅ Yes (cloud-brained) |
| **Ollama** | Run small models (Llama 3.2 1B, Phi-3 mini) locally | ⚠️ Crawls on 2012 Mac — private but slow |
| **Pinecone / Chroma** | Vector databases = AI memory that searches *thousands* of your documents by meaning | ✅ Pinecone = free cloud tier; Chroma = light local install |

**About Pinecone** (yes Sameer, the "ponytail" repo 😄): it's the famous vector-memory database. Honest Challenger note: **you don't need it yet** — your Mind + Knowledge Base already handle hundreds of documents. Graduate to Pinecone/Chroma when you're feeding JARVIS *thousands* of documents and need meaning-based search. That's the moment I wire it in.

**Reality check (⚔️ Challenger speaking):** your MacBook's 8GB RAM is the hard wall for *local* AI. The architecture stays: **cloud brain + local memory + automation hands**. When you eventually get any modern machine (even a ₹35k laptop with 16GB), the same repos unlock locally.

---

## 🦞 PHASE 2.5 — OpenClaw (the hardcore agent backbone)
**OpenClaw** (openclaw.ai, formerly Clawdbot) is the famous open-source personal-AI gateway: it runs 24/7 on a server, chats via **WhatsApp / Telegram / Discord**, and controls real tools (shell, browser, files). Verified Oct 2026: install requires **Node 24.22+ / 26.12+**.

⚠️ **Hardware truth (Challenger):** the late-2012 MacBook maxes out at macOS Catalina → cannot run modern Node → **cannot host OpenClaw**. JARVIS MK-II (browser app) remains the Mac's interface. To host OpenClaw, pick ONE:

| Path | Cost | Notes |
|---|---|---|
| **Cheap VPS** (Hetzner/Contabo/DO) | ~₹400–600/mo | Recommended. Ubuntu 24.04 → installer below → daemon runs 24/7 |
| **Oracle Cloud Always Free** | ₹0 | Free ARM VPS forever; signup needs a card |
| **Spare Android + Termux** | ₹0 | Hacky: `pkg install nodejs` then check `node -v` ≥ 24.22 — only works if Termux ships a new-enough Node |
| **Any modern machine later** | — | Runs fine the day you upgrade |

**Install (on a supported Linux/Mac machine):**
```bash
curl -fsSL https://openclaw.ai/install.sh | bash   # provisions Node 26 automatically
openclaw onboard --install-daemon
```
**Model keys:** OpenClaw natively accepts the same free stack as JARVIS: `gemini-api-key`, `groq-api-key`, `openrouter-api-key`, `cerebras`, `mistral`, `cohere`, `huggingface` — connect during onboarding.

**Security (non-negotiable):** OpenClaw has FULL system access by design (`--accept-risk`). Never expose the gateway port to the internet, allowlist only your own Telegram/WhatsApp accounts, read docs.openclaw.ai security guide before giving it real powers.

** npm warning learned the hard way (Oct 2026):** a stale/placeholder `openclaw@0.0.1` "empty placeholder" package exists on some registry mirrors. Only trust `openclaw@latest` from registry.npmjs.org showing version `2026.x.y`.


Goal: an actual model fine-tuned on *you*. Free, using **Google Colab** (free GPU hours):

1. **Collect:** SETUP → Export Backup gives your conversations in JSON.
2. **Train (free):** in Colab, use the **Unsloth** repo (github.com/unslothai/unsloth) — fine-tune **Llama 3.2 3B** or **Qwen 2.5 3B** with LoRA on your chat exports. Runs on Colab's free T4 GPU in under an hour.
3. **Deploy:** upload to **Hugging Face Hub** → call it from JARVIS via **HF Inference API** (free tier) as an alternate brain.
4. **Or use HF Spaces:** thousands of ready AI tools (image gen, OCR, translation) you can call free.

⚠️ Honest truth: a 3B model fine-tuned on your data will know your *style and facts* but will be *dumber* than Llama 70B. Best design: **fine-tuned small model for personality/memory, big cloud model for brains** — JARVIS routes to the right one. (This is exactly how commercial personal AIs do it.)

---

## 📈 PHASE 4 — The "Superintelligence" Truth
What people call superintelligence in 2026 = **agentic loops**: plan → act → check result → improve → repeat, with memory and tools. That is buildable by you, phase by phase, and it already outperforms 99% of "AI side projects".

What does NOT exist (anywhere, for anyone): recursive self-improving AI that trains itself overnight. Anyone selling you that is selling smoke. Your JARVIS's real self-training loop is:

```
you live → JARVIS listens → Auto-Learn stores facts → Knowledge Base grows
        → answers get sharper → Operator closes tasks → results compound
```

Run that loop daily for 6 months and it will genuinely feel like it evolved. Because it did.

---

## 🎓 BONUS — The Innovator's real opportunity
Everything you're learning here (APIs, agents, RAG, fine-tuning, security) is the exact skill stack of an **AI engineer** (₹6–30 LPA entry in India right now, remote possible). Your JARVIS project IS your portfolio. Phase 3 alone — "I fine-tuned my own model" — beats most CS degrees in an interview.

**Suggested first task for the Operator:** `/task study Python basics 30 min daily — start with "Python for Everybody" (free, py4e.com)`

---

## 📁 Files in this project
| File | Purpose |
|---|---|
| `index.html` | The entire JARVIS app — 8 AI brains, agent loop, image engine, CONTROL tab |
| `agent/agent.py` | **Device Agent** — real device control (MacBook/Termux/Linux), token-secured, zero installs |
| `agent/README-AGENT.md` | Agent setup for every device + your first GitHub repo steps |
| `manifest.json` + `sw.js` + `icons/` | Makes JARVIS an installable app (PWA) on phone & laptop |
| `README.md` | Setup, commands, troubleshooting |
| `PROMPTS.md` | Your polished prompt arsenal |
| `ROADMAP.md` | This file — the master plan |

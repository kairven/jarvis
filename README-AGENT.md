# 🦾 JARVIS Device Agent — Setup Guide
### Give JARVIS hands: real control of your MacBook, phone & any Linux machine

One file: `agent.py`. **Zero installations** — Python 3 only, no pip, no npm.
The cloud AI (your 8-brain JARVIS) can now run real actions on your devices.

---

## What it can do

| Action | MacBook | Android (Termux) | Linux | Windows |
|---|---|---|---|---|
| Battery / status / date / disk / processes / network | ✅ | ✅ | ✅ | ✅ basic |
| Volume up/down/mute/set | ✅ | ✅ | ✅ | ➖ |
| Speak text out loud | ✅ `say` | ✅ | ✅ espeak | ✅ |
| Open URL/app | ✅ | ✅ | ✅ | ✅ |
| Screenshot | ✅ | ➖ | ✅ | ➖ |
| Notification | ✅ | ✅ | ✅ | ➖ |
| Torch on/off | ➖ | ✅ | ➖ | ➖ |
| Clipboard get/set | ✅ | ✅ | ✅ | ➖ |
| Whisper speech-to-text (Hugging Face) | ✅ | ✅ | ✅ | ✅ |

---

## Setup 1 — MacBook (Late 2012) ✅ works out of the box

```bash
cd ~/Desktop/jarvis/agent
python3 agent.py
```
- If "command not found": run `xcode-select --install` once (gives you python3), or install Miniconda.
- Copy the **token** it prints → open JARVIS → 🎛️ **CONTROL** tab → paste `http://127.0.0.1:8420` + the token → **SAVE** → **PING**.
- That's it. Try `/run status` in chat, or say *"JARVIS, what's my battery?"*

## Setup 2 — Android phone (Termux) — the "control my phone" mode

1. Install **Termux** (from F-Droid, not Play Store) + the **Termux:API** app (also F-Droid)
2. In Termux:
```bash
pkg update && pkg install python termux-api
cd ~ ; # copy agent.py here (e.g. download from your GitHub repo)
python3 agent.py
```
3. In JARVIS (CONTROL tab) enter `http://127.0.0.1:8420` + the phone's token — or from your **Mac**, enter the phone's IP (`ifconfig` in Termux → wlan0) with the agent started as:
```bash
python3 agent.py --bind 0.0.0.0   # LAN mode — Mac can now control the phone
```
4. Torch, SMS-style notifications, battery, TTS — all yours.

## Setup 3 — Any Linux / VPS
```bash
python3 agent.py --bind 0.0.0.0
```
Open the port in your firewall ONLY on trusted home WiFi. Never expose to the internet.

---

## 🔒 Security model (read once)

- **Token required** for every command (auto-generated, saved in `~/.jarvis_agent_token`)
- **Allowlist only** — volume, battery, screenshot, etc. Free-form shell is **disabled by default**; `rm -rf /` gets *refused* (tested!). Enable with `--unsafe` only if you accept the risk
- **Binds to 127.0.0.1 by default** = only this device can talk to it. `--bind 0.0.0.0` opens LAN (WiFi) control — use on home networks only
- JARVIS's AI can only trigger the **same allowlisted actions** — it cannot run arbitrary commands unless you enable unsafe mode

## 🎙️ Whisper (Hugging Face) mode
```bash
python3 agent.py --hf-token hf_yyyy
```
Then CONTROL tab → drop an audio file → **TRANSCRIBE** — the free `openai/whisper-large-v3-turbo` model writes the text into your chat input.

---

## 📧 Telegram + Gmail + PDF (agent v1.1 — all free)

**Telegram alerts (your phone, free forever):**
1. In Telegram: message **@BotFather** → `/newbot` → copy the **token**
2. Message **@userinfobot** → copy your **chat id**
3. Run the agent once with:
```bash
python3 agent.py --tg-token 123456:ABC --tg-chat 123456789
```
Config saves to `~/.jarvis_agent_config.json` (permission 600). Then in JARVIS chat: **"JARVIS, telegram: business plan done ✅"** → the AI fires `[DEVICE: tg ...]` → your phone buzzes.

**Gmail send/read (needs a free App Password — NOT your login password):**
1. myaccount.google.com → **Security** → turn on **2-Step Verification**
2. Same page → **App passwords** → create one (16 characters)
3. `python3 agent.py --gmail-user you@gmail.com --gmail-app 'xxxxxxxxxxxxxxxx'`
4. Then: *"JARVIS, mail rahil@example.com | Party tonight | See you at 8"* or *"JARVIS, mail read 5"* (reads latest subjects)

**PDF text extraction (one-time `pip install pypdf` — pure Python, works on Mac + Termux):**
```
/run pdf ~/Documents/my-notes.pdf
```
Then say "summarize that" — your free cloud brains do the thinking; the Mac does zero heavy lifting.

> 🔒 **Security:** these credentials live in `~/.jarvis_agent_config.json` on YOUR device (chmod 600). They never touch the cloud. Revocable anytime (delete app password / bot token via BotFather `/revoke`).

## 🐙 Make it your first GitHub repo (10 min)

```bash
cd jarvis
git init
git add .
git commit -m "JARVIS MK-II — my personal AI"
git branch -M main
# create an empty repo named jarvis on github.com first, then:
git remote add origin https://github.com/YOUR-USERNAME/jarvis.git
git push -u origin main
```
Now you can `git clone` your whole AI onto any device — phone, college lab, future laptop. A public GitHub repo with a working AI agent + PWA **is** a portfolio.

## "Control devices" from the AI itself — how it works
```
You: "JARVIS, it's too loud"
  → cloud brain thinks → outputs [DEVICE: volume down]
  → JARVIS app sends it to agent.py (token-verified)
  → your MacBook volume drops → AI answers "Done, sir."
```
That is a real AI agent controlling a real device. You built it. 🫡

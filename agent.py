#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
J.A.R.V.I.S. MK-II — DEVICE AGENT v1
=====================================
The "hands" of JARVIS. A ZERO-DEPENDENCY Python agent (stdlib only) that
executes real device actions on behalf of the JARVIS web app + cloud LLM.

Runs on:  macOS 10.15+ (your late-2012 MacBook!), Android/Termux, Linux, Windows
Controls: volume, battery, screenshots, open apps/URLs, speech, notifications,
          torch, clipboard, system info — plus optional Hugging Face Whisper
          speech-to-text.

Security model:
  - Token auth: every /cmd needs your token (auto-generated on first run)
  - Action allowlist: only predefined actions; NO free-form shell unless --unsafe
  - Binds to 127.0.0.1 (this device only) unless you pass --bind 0.0.0.0

Usage:
  python3 agent.py                       # safe, this-device only
  python3 agent.py --bind 0.0.0.0        # allow phone <-> laptop control on LAN
  python3 agent.py --port 8420 --token mysecret
  python3 agent.py --hf-token hf_xxx     # enable Whisper speech-to-text
"""

import argparse
import json
import os
import platform as pyplatform
import shutil
import socket
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# ---------------------------------------------------------------- constants
VERSION = "1.1.0"
TOKEN_FILE = os.path.join(os.path.expanduser("~"), ".jarvis_agent_token")
CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".jarvis_agent_config.json")
HF_STT_URL = "https://router.huggingface.co/v1/audio/transcriptions"
HF_STT_MODEL = "openai/whisper-large-v3-turbo"

ARGS = None          # filled in main()
TOKEN = None         # filled in main()
CFG = {}             # optional integrations config (gmail/telegram)
IS_TERMUX = shutil.which("termux-battery-status") is not None

# ---------------------------------------------------------------- helpers
def sh(cmd, timeout=20, stdin_text=None):
    """Run a command, return (ok, output). Never raises."""
    try:
        p = subprocess.run(cmd, capture_output=True, text=True,
                           timeout=timeout, input=stdin_text)
        out = (p.stdout or "").strip()
        err = (p.stderr or "").strip()
        return (p.returncode == 0, out if out else err)
    except FileNotFoundError:
        return (False, "command not found: %s" % cmd[0])
    except subprocess.TimeoutExpired:
        return (False, "command timed out")
    except Exception as e:
        return (False, "error: %s" % e)

def unsupported(what):
    return (False, "'%s' is not supported on this device (missing tool or platform)" % what)

def load_cfg():
    try:
        return json.load(open(CONFIG_FILE))
    except Exception:
        return {}

def save_cfg(d):
    try:
        json.dump(d, open(CONFIG_FILE, "w"), indent=2)
        os.chmod(CONFIG_FILE, 0o600)
    except Exception:
        pass

# ---------------------------------------------------------------- platform info
def platform_name():
    if IS_TERMUX:
        return "android-termux"
    sysr = sys.platform
    if sysr.startswith("darwin"):
        return "mac"
    if sysr.startswith("linux"):
        return "linux"
    if sysr.startswith("win"):
        return "windows"
    return sysr

def dev_label():
    return pyplatform.node() or "unknown-device"

# ---------------------------------------------------------------- actions
def a_status(arg):
    lines = []
    lines.append("platform : " + platform_name())
    lines.append("device   : " + dev_label())
    lines.append("system   : %s %s" % (pyplatform.system(), pyplatform.release()))
    ok, out = a_battery("")
    lines.append("battery  : " + (out if ok else "n/a"))
    ok, out = sh(["uptime"])
    if ok: lines.append("uptime   : " + out)
    return (True, "\n".join(lines))

def a_battery(arg):
    p = platform_name()
    if p == "mac":
        ok, out = sh(["pmset", "-g", "batt"])
        if ok:
            for part in out.split():
                if part.endswith("%"):
                    charging = "discharging" not in out.lower()
                    return (True, part + (" (charging)" if charging else ""))
        return (False, out or "battery info not found")
    if p == "android-termux":
        ok, out = sh(["termux-battery-status"])
        if ok:
            try:
                d = json.loads(out)
                return (True, "%s%% (%s)" % (d.get("percentage"), d.get("status")))
            except Exception:
                return (False, out)
        return (False, out)
    if p == "linux":
        base = "/sys/class/power_supply"
        if os.path.isdir(base):
            for bat in sorted(os.listdir(base)):
                if bat.startswith("BAT"):
                    try:
                        cap = open(os.path.join(base, bat, "capacity")).read().strip()
                        st = ""
                        stf = os.path.join(base, bat, "status")
                        if os.path.exists(stf):
                            st = " (" + open(stf).read().strip().lower() + ")"
                        return (True, cap + "%" + st)
                    except Exception:
                        pass
        return (False, "no battery detected (desktop?)")
    if p == "windows":
        ok, out = sh(["wmic", "Path", "Win32_Battery", "Get", "EstimatedChargeRemaining"])
        if ok:
            nums = [t for t in out.split() if t.rstrip("%").isdigit()]
            if nums:
                return (True, nums[-1] + "%")
        return (False, out)
    return unsupported("battery")

def a_volume(arg):
    p = platform_name()
    arg = (arg or "get").strip().lower()
    if p == "mac":
        def getvol():
            ok, out = sh(["osascript", "-e", "output volume of (get volume settings)"])
            return (int(out) if ok and out.isdigit() else None)
        if arg == "get":
            v = getvol()
            return (True, "volume: %s%%" % v) if v is not None else (False, "cannot read volume")
        if arg == "mute":
            ok, out = sh(["osascript", "-e", "set volume output muted true"])
            return (ok, "muted" if ok else out)
        if arg == "unmute":
            ok, out = sh(["osascript", "-e", "set volume output muted false"])
            return (ok, "unmuted" if ok else out)
        cur = getvol() or 30
        if arg == "up":
            target = min(100, cur + 10)
        elif arg == "down":
            target = max(0, cur - 10)
        else:
            try:
                target = max(0, min(100, int(arg)))
            except ValueError:
                return (False, "volume arg must be up/down/mute/N")
        ok, out = sh(["osascript", "-e", "set volume output volume %d" % target])
        return (ok, "volume set to %d%%" % target if ok else out)
    if p == "android-termux":
        if arg in ("up", "down"):
            key = "24" if arg == "up" else "25"
            return sh(["input", "keyevent", key]) or (False, "keyevent failed")
        if arg == "mute":
            return sh(["input", "keyevent", "164"])
        try:
            n = max(0, min(15, int(arg)))
            return sh(["termux-volume", "music", str(n)])
        except ValueError:
            return (False, "volume arg must be up/down/mute/0-15")
    if p == "linux":
        if shutil.which("pactl"):
            mapping = {"up": "+10%", "down": "-10%", "mute": "0%"}
            if arg in mapping:
                return sh(["pactl", "set-sink-volume", "@DEFAULT_SINK@", mapping[arg]])
            try:
                return sh(["pactl", "set-sink-volume", "@DEFAULT_SINK@", "%d%%" % int(arg)])
            except ValueError:
                return (False, "volume arg must be up/down/mute/N")
        if shutil.which("amixer"):
            mapping = {"up": "10%+", "down": "10%-"}
            if arg in mapping:
                return sh(["amixer", "-q", "sset", "Master", mapping[arg]])
            try:
                return sh(["amixer", "-q", "sset", "Master", "%d%%" % int(arg)])
            except ValueError:
                return (False, "volume arg must be up/down/mute/N")
        return unsupported("volume (install pactl or amixer)")
    return unsupported("volume")

def a_speak(arg):
    if not arg:
        return (False, "speak needs text")
    p = platform_name()
    if p == "mac":
        return sh(["say", arg], timeout=60)
    if p == "android-termux":
        return sh(["termux-tts-speak", arg], timeout=60)
    if p == "linux":
        if shutil.which("espeak"):
            return sh(["espeak", arg], timeout=60)
        if shutil.which("spd-say"):
            return sh(["spd-say", arg], timeout=60)
        return unsupported("speak (install espeak)")
    if p == "windows":
        ps = 'Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak("%s")' % arg.replace('"', "'")
        return sh(["powershell", "-c", ps], timeout=60)
    return unsupported("speak")

def a_open(arg):
    if not arg:
        return (False, "open needs a URL or path")
    p = platform_name()
    if p == "mac":
        return sh(["open", arg])
    if p == "android-termux":
        return sh(["termux-open", arg])
    if p == "linux":
        if shutil.which("xdg-open"):
            return sh(["xdg-open", arg])
        return unsupported("open (xdg-open missing)")
    if p == "windows":
        return sh(["cmd", "/c", "start", "", arg])
    return unsupported("open")

def a_torch(arg):
    if platform_name() != "android-termux":
        return (False, "torch works on Android/Termux only (termux-api app required)")
    state = "on" if (arg or "").strip().lower() == "on" else "off"
    return sh(["termux-torch", state])

def a_notify(arg):
    if not arg:
        return (False, "notify needs text")
    p = platform_name()
    if p == "mac":
        return sh(["osascript", "-e",
                   'display notification "%s" with title "J.A.R.V.I.S."' % arg.replace('"', "'")])
    if p == "android-termux":
        return sh(["termux-notification", "--title", "J.A.R.V.I.S.", "--content", arg])
    if p == "linux":
        if shutil.which("notify-send"):
            return sh(["notify-send", "J.A.R.V.I.S.", arg])
        return unsupported("notify (install libnotify)")
    return unsupported("notify")

def a_screenshot(arg):
    p = platform_name()
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    if p == "mac":
        path = os.path.expanduser("~/Desktop/jarvis-%s.png" % ts)
        return sh(["screencapture", "-x", path]) and (True, "saved to " + path) or (False, "screencapture failed")
    if p == "linux":
        if shutil.which("gnome-screenshot"):
            path = os.path.expanduser("~/jarvis-%s.png" % ts)
            return sh(["gnome-screenshot", "-f", path]) and (True, "saved to " + path) or (False, "screenshot failed")
        if shutil.which("import"):
            path = os.path.expanduser("~/jarvis-%s.png" % ts)
            return sh(["import", "-window", "root", path]) and (True, "saved to " + path) or (False, "import failed")
        return unsupported("screenshot (install gnome-screenshot or imagemagick)")
    return unsupported("screenshot")

def a_clipboard(arg):
    mode = (arg or "").strip()
    p = platform_name()
    if mode.startswith("set:"):
        text = mode[4:]
        if p == "mac":
            return sh(["pbcopy"], stdin_text=text) or (False, "pbcopy failed")
        if p == "android-termux":
            return sh(["termux-clipboard-set", text])
        if p == "linux" and shutil.which("xclip"):
            return sh(["xclip", "-selection", "clipboard"], stdin_text=text)
        return unsupported("clipboard")
    # get
    if p == "mac":
        ok, out = sh(["pbpaste"])
        return (ok, out[:2000] if ok else out)
    if p == "android-termux":
        return sh(["termux-clipboard-get"])
    if p == "linux" and shutil.which("xclip"):
        return sh(["xclip", "-selection", "clipboard", "-o"])
    return unsupported("clipboard")

# ---- allowlisted system commands (safe read-only info) ----
def _first_ok(cmds):
    for c in cmds:
        if shutil.which(c[0]):
            return sh(c)
    return (False, "none of %s installed" % cmds[0][0])

def a_sys(arg):
    what = (arg or "").strip().lower()
    if what in ("sysinfo", "uname"):
        return sh(["uname", "-a"])
    if what == "disk":
        return _first_ok([["df", "-h"]])
    if what == "mem":
        if platform_name() == "mac":
            return sh(["vm_stat"], timeout=10)
        return _first_ok([["free", "-m"]])
    if what == "processes":
        return sh(["ps", "aux"]) if platform_name() != "windows" else sh(["tasklist"])
    if what == "network":
        if platform_name() == "android-termux":
            return sh(["ifconfig"])
        return _first_ok([["ip", "addr"], ["ifconfig"]])
    if what == "whoami":
        return sh(["whoami"])
    if what == "date":
        return (True, datetime.now().strftime("%A, %d %B %Y %H:%M:%S"))
    return (False, "unknown sys command '%s'. allowed: sysinfo disk mem processes network whoami date" % what)

def a_shell(arg):
    if not ARGS.unsafe:
        return (False, "refused: free shell is disabled. Start agent with --unsafe to enable (at your own risk).")
    if not arg:
        return (False, "shell needs a command")
    return sh(["bash", "-c", arg], timeout=60)


def a_mail(arg):
    """Send via Gmail app-password SMTP, or read latest inbox subjects."""
    if not CFG.get("gmail_user") or not CFG.get("gmail_app"):
        return (False, "email not configured. Restart agent ONCE with: --gmail-user you@gmail.com --gmail-app '16-char app password'  (get it: myaccount.google.com > Security > 2-Step Verification > App passwords). It is saved locally in " + CONFIG_FILE)
    arg = (arg or "").strip()
    if arg.lower().startswith("read"):
        n = 5
        parts = arg.split()
        if len(parts) > 1 and parts[1].isdigit():
            n = min(int(parts[1]), 20)
        import imaplib
        import email as emaillib
        try:
            m = imaplib.IMAP4_SSL("imap.gmail.com")
            m.login(CFG["gmail_user"], CFG["gmail_app"])
            m.select("INBOX")
            typ, data = m.search(None, "ALL")
            ids = data[0].split()[-n:]
            lines = []
            for i in reversed(ids):
                typ, d = m.fetch(i, "(BODY[HEADER.FIELDS (FROM SUBJECT DATE)])")
                raw = d[0][1].decode("utf-8", "replace")
                msg = emaillib.message_from_string(raw)
                lines.append("* %s | %s | %s" % (msg.get("From", "?")[:40], msg.get("Subject", "(no subject)")[:70], msg.get("Date", "")[:16]))
            m.logout()
            return (True, "\n".join(lines) if lines else "inbox empty")
        except Exception as e:
            return (False, "mail read failed: %s" % e)
    parts = [p.strip() for p in arg.split("|")]
    if len(parts) < 3:
        return (False, "send format:  mail to@example.com | Subject here | Body text here   (or:  mail read 5)")
    import smtplib
    from email.mime.text import MIMEText
    from email.header import Header
    from email.utils import formataddr
    try:
        msg = MIMEText(parts[2], "plain", "utf-8")
        msg["From"] = formataddr(("J.A.R.V.I.S.", CFG["gmail_user"]))
        msg["To"] = parts[0]
        msg["Subject"] = Header(parts[1], "utf-8")
        s = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30)
        s.login(CFG["gmail_user"], CFG["gmail_app"])
        s.send_message(msg)
        s.quit()
        return (True, "mail sent to " + parts[0])
    except Exception as e:
        return (False, "mail send failed: %s" % e)

def a_tg(arg):
    """Send a Telegram message via your own bot (free)."""
    if not CFG.get("tg_token") or not CFG.get("tg_chat"):
        return (False, "telegram not configured. Restart agent ONCE with: --tg-token 123456:ABC-DEF --tg-chat your_chat_id  (make a bot with @BotFather in Telegram; get your chat id from @userinfobot). Saved locally.")
    import urllib.request
    import urllib.parse
    url = "https://api.telegram.org/bot%s/sendMessage" % CFG["tg_token"]
    data = urllib.parse.urlencode({"chat_id": CFG["tg_chat"], "text": ("[JARVIS] " + (arg or "..."))[:4000]}).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=30) as r:
            d = json.loads(r.read().decode("utf-8", "replace"))
            if d.get("ok"):
                return (True, "telegram delivered")
            return (False, "telegram error: %s" % json.dumps(d)[:200])
    except Exception as e:
        return (False, "telegram failed: %s" % e)

def a_pdf(arg):
    """Extract text from a local PDF (needs one-time: pip install pypdf)."""
    path = os.path.expanduser((arg or "").strip())
    if not path or not os.path.exists(path):
        return (False, "pdf needs a valid file path, e.g.  pdf ~/Documents/notes.pdf")
    try:
        from pypdf import PdfReader
    except ImportError:
        try:
            from PyPDF2 import PdfReader
        except ImportError:
            return (False, "PDF reader not installed. One-time setup:  pip install pypdf   (pure-python, tiny, works on Mac + Termux)")
    try:
        r = PdfReader(path)
        total = len(r.pages)
        pages = min(total, 30)
        text = "\n".join((p.extract_text() or "") for p in r.pages[:pages]).strip()
        if not text:
            return (False, "no extractable text (scanned images need OCR — different tool, ask JARVIS about the OCR path)")
        text = text[:3800]
        return (True, "extracted %d/%d pages:\n%s" % (pages, total, text))
    except Exception as e:
        return (False, "pdf parse failed: %s" % e)

ACTIONS = {
    "status": a_status, "battery": a_battery, "volume": a_volume,
    "speak": a_speak, "open": a_open, "torch": a_torch,
    "notify": a_notify, "screenshot": a_screenshot, "clipboard": a_clipboard,
    "sys": a_sys, "shell": a_shell,
    "mail": a_mail, "tg": a_tg, "pdf": a_pdf,
}

# ---------------------------------------------------------------- hf whisper stt
def hf_transcribe(audio_bytes, content_type):
    import urllib.request
    boundary = uuid.uuid4().hex
    fname = "audio.%s" % (content_type.split("/")[-1].split(";")[0] or "webm")
    parts = []
    parts.append(("--%s\r\n" % boundary).encode())
    parts.append(('Content-Disposition: form-data; name="model"\r\n\r\n').encode())
    parts.append((HF_STT_MODEL + "\r\n").encode())
    parts.append(("--%s\r\n" % boundary).encode())
    parts.append(('Content-Disposition: form-data; name="file"; filename="%s"\r\n' % fname).encode())
    parts.append(("Content-Type: %s\r\n\r\n" % (content_type or "application/octet-stream")).encode())
    parts.append(audio_bytes)
    parts.append(("\r\n--%s--\r\n" % boundary).encode())
    body = b"".join(parts)
    req = urllib.request.Request(HF_STT_URL, data=body, method="POST")
    req.add_header("Authorization", "Bearer " + ARGS.hf_token)
    req.add_header("Content-Type", "multipart/form-data; boundary=" + boundary)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            d = json.loads(r.read().decode("utf-8", "replace"))
            return (True, d.get("text", ""))
    except Exception as e:
        return (False, "HF transcription failed: %s" % e)

# ---------------------------------------------------------------- http server
class Handler(BaseHTTPRequestHandler):
    server_version = "JarvisAgent/" + VERSION

    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (datetime.now().strftime("%H:%M:%S"), fmt % args))

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-JARVIS-Token")

    def _json(self, code, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _authed(self):
        return self.headers.get("X-JARVIS-Token", "") == TOKEN

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/ping"):
            return self._json(200, {
                "ok": True, "agent": "jarvis", "version": VERSION,
                "auth": self._authed(),
                "platform": platform_name(), "device": dev_label(),
                "hf_stt": bool(ARGS.hf_token), "unsafe": bool(ARGS.unsafe),
            })
        return self._json(404, {"ok": False, "error": "unknown route (POST /cmd, GET /ping, POST /hf/stt)"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else b""

        if self.path.startswith("/hf/stt"):
            if not self._authed():
                return self._json(401, {"ok": False, "error": "bad token"})
            if not ARGS.hf_token:
                return self._json(400, {"ok": False,
                    "error": "agent started without --hf-token — speech-to-text disabled"})
            ok, out = hf_transcribe(body, self.headers.get("Content-Type", ""))
            return self._json(200 if ok else 502, {"ok": ok, "text" if ok else "error": out})

        if self.path.startswith("/cmd"):
            if not self._authed():
                return self._json(401, {"ok": False, "error": "bad or missing token"})
            try:
                req = json.loads(body.decode("utf-8", "replace")) if body else {}
            except Exception:
                return self._json(400, {"ok": False, "error": "invalid JSON"})
            action = str(req.get("action", "")).strip().lower()
            arg = str(req.get("arg", "") or "")
            fn = ACTIONS.get(action)
            if not fn:
                return self._json(400, {"ok": False,
                    "error": "unknown action '%s'. allowed: %s" % (action, ", ".join(sorted(ACTIONS)))})
            ok, out = fn(arg)
            return self._json(200 if ok else 400, {"ok": ok, "action": action, "output": out[:4000]})

        return self._json(404, {"ok": False, "error": "unknown route"})

# ---------------------------------------------------------------- main
def main():
    global ARGS, TOKEN
    ap = argparse.ArgumentParser(description="JARVIS Device Agent")
    ap.add_argument("--port", type=int, default=8420)
    ap.add_argument("--bind", default="127.0.0.1", help="127.0.0.1 = this device only (safe), 0.0.0.0 = LAN devices can control")
    ap.add_argument("--token", default=None, help="auth token (auto-generates & saves one if omitted)")
    ap.add_argument("--unsafe", action="store_true", help="enable 'shell' action — free-form commands, RISKY")
    ap.add_argument("--hf-token", dest="hf_token", default=None, help="Hugging Face token — enables Whisper speech-to-text")
    ap.add_argument("--gmail-user", dest="gmail_user", default=None, help="Gmail address for mail send/read (saved locally)")
    ap.add_argument("--gmail-app", dest="gmail_app", default=None, help="Gmail 16-char App Password (NOT your login password)")
    ap.add_argument("--tg-token", dest="tg_token", default=None, help="Telegram bot token from @BotFather (saved locally)")
    ap.add_argument("--tg-chat", dest="tg_chat", default=None, help="Your Telegram chat id (from @userinfobot)")
    ARGS = ap.parse_args()

    if ARGS.token:
        TOKEN = ARGS.token
    else:
        if os.path.exists(TOKEN_FILE):
            TOKEN = open(TOKEN_FILE).read().strip()
        if not TOKEN:
            TOKEN = uuid.uuid4().hex[:16]
            try:
                open(TOKEN_FILE, "w").write(TOKEN)
                os.chmod(TOKEN_FILE, 0o600)
            except Exception:
                pass

    global CFG
    cfg = load_cfg()
    changed = False
    for k, v in (("gmail_user", ARGS.gmail_user), ("gmail_app", ARGS.gmail_app), ("tg_token", ARGS.tg_token), ("tg_chat", ARGS.tg_chat)):
        if v:
            cfg[k] = v
            changed = True
    if changed:
        save_cfg(cfg)
    CFG = cfg

    banner = r"""
   ___   _   _____   _   _ _____ ____
  |_ _| /_\ | _ \ /_\ | | | | ____|  _ \
   | | / _ \|   / _ \| |_| |  _| | |_) |
  |___/_/ \_\_|_\_/ \_\\___/|_____|____/
        DEVICE AGENT v%s  —  eyes, ears & hands
""" % VERSION
    print(banner)
    print("  platform : %s (%s)" % (platform_name(), dev_label()))
    print("  listening: http://%s:%d" % (ARGS.bind, ARGS.port))
    print("  token    : %s   <-- enter this in JARVIS > SETUP" % TOKEN)
    print("  actions  : %s" % ", ".join(sorted(ACTIONS)))
    if ARGS.hf_token:
        print("  HF stt   : enabled (%s)" % HF_STT_MODEL)
    if ARGS.unsafe:
        print("  !! UNSAFE MODE: free shell ENABLED")
    if CFG.get("gmail_user"):
        print("  email    : ready (%s) — actions: mail 'to | subject | body' / mail read 5" % CFG["gmail_user"])
    if CFG.get("tg_token"):
        print("  telegram : ready — action: tg 'message'")
    if not (CFG.get("gmail_user") or CFG.get("tg_token")):
        print("  email/tg : not configured (optional — see README-AGENT.md)")
    if ARGS.bind == "0.0.0.0":
        print("  !! LAN MODE: other devices on your WiFi can reach this agent (token required)")
    print("")

    srv = ThreadingHTTPServer((ARGS.bind, ARGS.port), Handler)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nJARVIS agent shutting down. Goodbye, sir.")

if __name__ == "__main__":
    main()

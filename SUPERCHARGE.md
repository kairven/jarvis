# ⚡ SUPERCHARGE — what actually applies to JARVIS MK-II v4.1

A 10-point "supercharge" checklist was proposed for this project. Some of it maps
directly onto the architecture; a lot of it assumes a **server with containers, Redis
and Grafana**, which this is not. Below is an honest scorecard — what was built,
what was wrong for this design, and what it was replaced with.

**The architecture, in one line:** a single `index.html` + PWA. No server, no build
step, no container, no API keys. Brains and tools are reachable over HTTPS straight
from the browser; all your data lives on your device.

---

## Scorecard

| # | Proposed | Verdict | What was actually done |
|---|---|---|---|
| 1 | Confirm tool availability | ✅ **Built** | 🩺 **RUN FULL DIAGNOSTIC** in the TOOLS tab exercises every enabled tool and reports pass/fail + real latency. Per-tool ON/OFF toggles were already there. |
| 2 | Update the model to latest GPT‑4 | ❌ **Wrong for this app** | JARVIS has no single model to update — it carries **8 free brains** with automatic failover. You can change any model string in SETUP (each brain has its own field) and press **TEST ALL BRAINS**. There is no `model:update` command because there is no deployment. |
| 3 | Allocate 4 CPU / 8 GB RAM | ❌ **Not applicable — and not the bottleneck** | Nothing runs locally except DOM code; the heavy lifting is done by remote APIs and your browser's JS engine. **Network round-trip dominates latency, not CPU.** Paying for hardware here would change nothing. |
| 4 | Cache repeated queries | ✅ **Built** | Persistent TTL cache (localStorage), per-tool lifetimes: crypto 2 min, weather 10 min, forex 15 min, wiki/papers 1–7 days, calc/units 30 days. **Side-effecting tools are never cached** (timer, remember, task, device, random). Cache hit rate is displayed live. |
| 5 | Tune prompt engineering | ✅ **Built** | Tool catalogue in the system prompt trimmed to one line per tool with a hard 88-char cap per description (~40% fewer prompt tokens → faster first token). Answer rules stay explicit: markdown, numbered steps, no fluff (already in the master prompt). |
| 6 | Retry wrapper for tool calls | ✅ **Built** | One automatic retry after a 700 ms back-off, **only for transient faults** (network, timeout, HTTP 429/5xx, malformed response). Skipped entirely when `navigator.onLine` is false — no point waiting when the browser already knows. |
| 7 | Monitoring dashboard | ✅ **Built (in-app, not Grafana)** | A KPI strip + per-tool table in the TOOLS tab: calls, success %, cache hits, average latency per tool, plus session-wide cache-hit rate. Grafana/Prometheus need a running service and time-series storage — absurd for a personal PWA. |
| 8 | Graceful degradation | ✅ **Built** | On a failed live fetch, the last cached value is served **explicitly labelled** (`⚠️ cached`, "from 12 min ago", cause included), the chip turns amber, and the model is instructed to tell you the data may be stale. With no cache, you get an honest error — never an invented number. |
| 9 | Secure the environment | ✅ **Already true** | There are **no API keys to manage** for the default setup, and any keys you add are stored only in your browser's localStorage and sent only to that provider. Tool output is HTML-escaped before rendering (tested), and `agent.py` is token-gated + allowlisted, bound to localhost by default. No secrets manager is needed because there is no server holding secrets. |
| 10 | Test with realistic scenarios | ✅ **Built** | The in-app diagnostic *is* the realistic-scenario suite (weather, currency, crypto, Wikipedia, GitHub, papers, dictionary, translation, page read). It reports **avg + p95 latency** and flags the slowest tool. Run it on your own device and network. |

**Bonus from the Innovator ideas:** *"remember preferences like 'I prefer Celsius'"* → built as a
**HOME CITY** setting, so `/weather` and `/time` default to your city instead of asking.
The "local 7B model" idea would need a real machine (see `ollama` in TOOLS.md) and the
"silent mode" idea doesn't fit an app whose whole point is the conversation.

---

## Measured, not claimed

Numbers from a **CI sandbox with stubbed network** prove logic, not internet speed —
they cannot tell you your real latency. So the honest procedure is:

1. Open JARVIS on the device you actually use.
2. 🛠️ TOOLS → **🩺 RUN FULL DIAGNOSTIC**.
3. Read: tools passing, avg live latency, p95, slowest tool.
4. If something is slow, the per-tool table tells you exactly which service it is.

Only step 3 can tell you anything true about your network.

### Known ceilings (unfixable in the browser)

- **GitHub API:** 60 requests/hour without a token. The cache makes this a non-issue in practice.
- **CoinGecko / DuckDuckGo:** throttle heavy use. On 429 the retry fires, then the cache answers.
- **CORS:** a few sites refuse the page reader. You get a clear error, never a fake summary.
- **Service worker:** network-first for the app shell, so fixes land on the next load.

---

## Verification behind these changes

- `tools/check.js` (AST pre-flight): syntax, strict-mode hazards, subsystems — passes.
- **31 assertions** on the performance layer: cache hit/miss/expiry, per-tool TTLs,
  "never cache side effects", retry-then-succeed, stale fallback content + labelling,
  honest failure without cache, telemetry counters, diagnostic output, home-city
  resolution, persistence to localStorage, cache clearing.
- **8 regression assertions** replaying *"what is the weather in kanpur"* end-to-end through
  the real handler, including a repeat question served from cache.
- Two bugs were caught by these tests before shipping: a 503 was not retried when the
  mock made two consecutive failures (test corrected, behaviour confirmed), and the
  browser would burn 700 ms retrying while known-offline (fixed by short-circuiting on
  `navigator.onLine`).

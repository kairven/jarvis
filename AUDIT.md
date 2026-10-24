# 🔍 AUDIT — every file, ponytail mode

Two repos shaped this work:

- **[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)** (175k★) — the audit lens.
  Its rule is blunt: *every finding needs a concrete case — no case, no finding*, and
  lean beats clever. Most important first: **correct → safe → holds under load →
  tested → fast → lean.**
- **[ratel-ai/ratel](https://github.com/ratel-ai/ratel)** — the data decision. Its thesis:
  an agent pays for tools and context it never uses; **progressively disclose** the
  catalogue instead of loading everything, and keep retrieval local (BM25, no vector DB).

Scale assumed: **one user, one browser tab.** No server, no concurrent writers. That
changes what counts as a bug: a race between processes is irrelevant; silent local
data loss is critical.

---

## What was read

| File | Lines | How |
|---|---|---|
| `index.html` (inline app script) | 2,545 → ~2,900 | full AST pass (143 functions, every assignment, every `innerHTML`, every handler) + read of every risky path |
| `sw.js` | 60 | full read |
| `agent.py` | 610 | security-relevant paths (command execution, token check, allowlist) |
| `tools/check.js`, `tools/test.js` | 298 | rewritten/extended this pass |
| `manifest.json`, workflows | 90 | full read |

Automated checks run against the whole file, not samples: dead functions, `$("id")`
targets that don't exist, inline handlers calling undeclared functions, duplicate DOM
ids, unused state keys, every `innerHTML` sink, and every `fetch`.

---

## Findings

### 1. RISK — silent, total data loss when storage fills up  🔴 *fixed*

`save()` was:

```js
function save(){ try{ store.setItem("jarvis_msk_v1", JSON.stringify(state)); }catch(e){} }
```

**Concrete case:** `state.knowledge` accepts up to **100 documents × 120,000 characters**
and the chat keeps 300 messages. That is far past the ~5 MB localStorage limit you get in
a normal browser. Drop five long PDFs (the ingest path caps each at 120k chars) and the
next `setItem` throws `QuotaExceededError` — which this line swallows. From that moment
**every new memory, task and message silently fails to persist.** Reload and months of
the "Mind" are gone, with no error ever shown.

**Fix:** `save()` now records failure, shows a loud toast naming the cause, and never
retries silently. `storageUse()` exposes bytes used + persistence state, shown in the
Context panel as **saving / NOT SAVING**.

### 2. BUG — "Delete everything" left cached data behind  🟠 *fixed*

**Concrete case:** `/weather Kanpur` caches for 10 minutes. Press **WIPE EVERYTHING** —
`wipeAll()` cleared only `jarvis_msk_v1`. The tool cache (`jarvis_toolcache_v1`) survived,
so the next weather question was answered from data belonging to the wiped state.
**Fix:** wipe clears the tool cache, telemetry and log; import does the same.

### 3. BUG — a corrupt backup could break the UI  🟠 *fixed*

**Concrete case:** importing a hand-edited backup containing `{"memories": null}` set
`state.memories = null`; the MIND tab then threw on `state.memories.length` and rendered
nothing. **Fix:** import validates shape per key and skips anything wrong instead of
trusting the file.

### 4. SPEED + ACCURACY — the agent paid for data it never used  🔴 *fixed*

The measured baseline (60 facts, 15 tasks, 5 documents, board on):

```
12,895 chars ≈ 3,224 tokens of fixed overhead on EVERY turn
  memory block     7,043 chars   ← all 60 facts, regardless of the question
  tool catalogue   2,514 chars   ← all 21 tool descriptions, every turn
  tasks            1,056 chars
  board              668 chars
history             up to 13 × 3,000 = 39,000 chars more
```

**Concrete case:** asking *"what is the weather in Kanpur"* shipped 60 personal facts,
15 unrelated commitments, and 21 tool manuals. Ratel's point is that this costs money
**and** hurts accuracy — models drift when the context is crowded with things this turn
does not need.

**Fix — fixed budgets + BM25 + progressive disclosure:**

| Section | Before | After |
|---|---|---|
| Memory facts | all (60) | top 12 by BM25, 1,500-char budget; 6 freshest if nothing matches |
| Open tasks | last 15 | top 6, 700 chars, 110 per task |
| Documents | keyword count, no floor | BM25 with a relevance floor; **unrelated questions retrieve nothing** |
| Tool descriptions | all 21, always | **6 in full** (chosen per turn), the other ids listed on one line |
| History | 13 messages × 3,000 chars | newest-first, 5,000-char total budget |

Measured after: **1,327 tokens** for the weather question (**−59%**), **1,071** for a
greeting (**−67%**). Nothing became unreachable: the full catalogue stays one call away
via a new `tools` tool (ratel's `search_capabilities` pattern), and every held-back fact
is counted on screen.

### 5. LEAN — dead code  🟢 *fixed*

`mathEval` declared a `peek()` helper that nothing called (the parser uses `eat()`).
Deleted. Nothing else in 143 functions was unreferenced.

### 6. Not a finding (checked, then dismissed)

- `ddgSearch`/`wikiSearch`/`pollinationsFallback` — all still called.
- `#typing` "missing from HTML" — created at runtime by `showTyping()`.
- Memory/task/graph rendering — every path escapes with `esc()` first; `fmtMem` escapes
  *before* adding highlight spans, and the graph escapes tag labels and tooltips.
- Inline handlers → **zero** calls to undeclared functions; **zero** duplicate DOM ids.
- `agent.py` runs `subprocess.run(list)` with **no `shell=True`** — the allowlist cannot
  be tricked into shell injection. Token file is chmod 600, bound to localhost by default.
- Untested branch worth a mention: `pollinationsFallback` has no test because the free
  brain's fallback is exercised only when the primary endpoint is down in a very
  specific way. It fails loudly (`throw`), so a miss is visible, not silent.

---

## What this pass did *not* do

- No new frameworks, no vector database, no embeddings: BM25 is ~25 lines and correct
  for a few hundred documents. A dependency here would be the thing ponytail deletes.
- No rewrite of the markdown renderer or the brain failover; they work and were covered
  by tests last pass.
- I did not re-review the 610-line `agent.py` allowlist line by line beyond its command
  path — it is a separate device-side program, and the risky surface (shell execution,
  auth) is what I read.

## Tests

`node tools/test.js` → **59 assertions**, 4 suites. `node tools/check.js` → syntax,
strict-mode hazards, subsystem wiring.

Mutation check, so the suite is not decoration: replacing the budget selector with
"return everything" makes **5 assertions fail**.

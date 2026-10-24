# 🎓 Teaching JARVIS — skills, and the honest limits

## First, the honest part

You cannot copy one AI's weights into another. There is no button that transfers a
model's training into `index.html`, and any project claiming to do it in a browser file
is selling you a prompt. JARVIS runs on free cloud models; its intelligence is theirs.

What *does* transfer, and what this release actually adds, is the thing that changes
output the most per kilobyte: **procedure and reference knowledge, delivered at the
moment it is relevant.**

That is not a downgrade. For real work, a mid-size model following a sharp procedure
beats a huge model improvising — and this app now has 22 procedures and 12 reference
notes on how transformers work, retrieved by relevance.

---

## 22 skills — procedures, not trivia

A skill is a *procedure*: the steps a senior person would apply. They are injected
**only when your message matches**, so all 22 together cost about as much as one.

| Skill | Fires when you talk about | What it actually does |
|---|---|---|
| 🐞 `debug` | bug, crash, error, stack trace | reproduce → bisect → one change per run → regression check |
| 🔍 `code-review` | review, refactor, code quality | correctness, safety, then style; walks the edges |
| 🏛 `architecture` | design, scale, database, stack | constraint first, data flow, fewest moving parts |
| 🧪 `testing` | tests, coverage, pytest, jest | tests the guarantee, not the method |
| ✍️ `writing` | essay, email, draft, rewrite | answer first, cut hedges, read aloud |
| 📚 `study` | exam, revision, learn, memorise | active recall, spaced, interleaved, past papers |
| 🏪 `business` | startup, customer, launch, sell | validate before build, charge from day one |
| 💰 `money` | price, profit, cash flow, margin | fixed vs variable, cash timing, price from value |
| 📣 `marketing` | audience, reach, content, brand | one channel, their words, show don't claim |
| 🤝 `negotiate` | deal, salary, contract, supplier | BATNA, anchor, trade don't concede |
| ⚖️ `decision` | decide, choose, trade-off | options, reversibility, what you learn |
| 🛡 `security` | hack, password, phishing, privacy | defence only, for your own systems |
| 🎛 `prompt` | prompt, instruction, llm, chatgpt | role/task/constraints/shape, evaluate on 10 cases |
| 🧠 `ai-learning` | learn AI, ML, roadmap, course | an ordered path that builds at every step |
| 🔎 `research` | sources, citation, evidence, paper | primary sources, counter-claim, cite what you read |
| 🎤 `interview` | interview, resume, recruiter, career | CAR stories, one real question, thank-you |
| 📖 `explain` | explain, simple, teach, ELI5 | bridge from the known, say where the analogy breaks |
| 📊 `data` | data, spreadsheet, metric, trend | denominator, plot first, correlation ≠ cause |
| 🌍 `intl-sales` | international, overseas, Dubai, UK, US | pick the market on timezone + payment, not size |
| 🔎 `leak-audit` | clinic, missed call, prospect, outreach | nine public checks; the audit *is* the product |
| 📄 `sow` | proposal, quote, scope, bid | one problem, one number, one price |
| ⚖️ `outreach-law` | cold email, GDPR, PECR, CAN-SPAM | per-market rules; the ones you must not email |

```
/skills          list them all
/skill debug     force one into the conversation
/debug           shortcut — same thing
```

Turn any of them off in **🛠️ TOOLS → SKILLS** if one is noisy.

---

## 12 teachings — how transformer models actually work

Compact reference notes carried in the app, retrieved by BM25 when a question needs
them. They are written to be *correct and load-bearing*, not motivational.

| Note | The one idea you keep |
|---|---|
| `transformers` | attention mixes tokens in one step; cost is quadratic in context length |
| `tokens` | 1 token ≈ 4 chars in English, but 2–4× more for Indic scripts — that is your bill |
| `embeddings` | cosine similarity finds meaning, fails on exact codes; hybrid with BM25 wins |
| `rag` | retrieval sets the ceiling; irrelevant context actively hurts |
| `tuning` | knowledge → retrieval; behaviour → prompt; fine-tune last |
| `agents` | a loop with error handling; five named failure modes |
| `eval` | 10–50 real cases, deterministic first, per-category not averages |
| `hallucination` | fluency and falsehood come from the same machinery; ground it |
| `local-models` | params × bytes per weight; 7B at 4-bit ≈ 4 GB + context |
| `inference-cost` | prefill dominates first-token time; shorter prompt = faster and cheaper |
| `multilingual` | training data is English-heavy; keep code and identifiers untranslated |
| `ai-path` | eight stages, build at every one, free sources named |

Ask things like *"why is my Hindi prompt more expensive"* or *"should I fine-tune or
use RAG"* and the matching note gets pulled in automatically.

---

## Teaching it yourself

The most valuable knowledge is not mine — it is yours. Anything specific to your life,
your business, your rules:

```
/teach Our cheapest plan is Rs 499/month and we never discount it.
/teach Never promise a delivery date before the supplier confirms.
/teach My exam is on 14 December and I study best in the morning.
```

Or use the box in **🛠️ TOOLS → TEACHINGS**. Your notes are stored in your Mind, shown
with a **MY NOTE** badge, deletable with ✕, and retrieved only when relevant.

**Duplicates are rejected** and anything under 12 characters is refused, so the library
stays clean. Rules of thumb for a good note: one idea, a fact or a constraint, phrased
as a rule — not a story.

---

## What this does *not* do

- **It does not make the model bigger.** Quality per answer still depends on which
  brain answers. Add a free key in SETUP for stronger brains.
- **It does not memorise like fine-tuning.** Notes are retrieved at question time, so a
  note must match the question to be used. Write it with the words you will actually use.
- **It cannot learn from its own mistakes automatically.** Auto-Learn extracts facts
  about *you*; skills are curated procedures and stay fixed unless you edit them.
- **No vector database.** BM25 is arithmetic in ~25 lines and is the right tool for a
  few hundred documents on a phone. A dependency here would be the thing you delete later.

---

## Sizes, so you can judge

| Thing | Size | Cost per turn |
|---|---|---|
| All 22 skills | ~9 KB | 0 unless matched; **max 1,500 chars** when matched |
| All 12 teachings | ~14 KB | 0 unless matched; **max 1,900 chars** when matched |
| Your own notes | ~1 KB each | only when relevant |

Verified: asking *"my code crashes with this error"* injects the debugging skill and
nothing else; *"what is the weather in Kanpur"* injects **no** skill at all.

---

## The Kairven kit — two commands that do actual work

The four procedures above are the *thinking*; two commands are the *artifact*:

```
/leak Smile Dental, Dubai
/proposal Smile Dental | missed calls after 7pm
```

`/leak` prints a nine-check worksheet with a pass/fail rule for each check and a
scoring band (0–2 = not a prospect, 6+ = call today). `/proposal` drafts the entire
SOW in four currencies and leaves every number you cannot know as a `[bracket]` that
the command then tells you to delete.

Both are deterministic: no model call, no token cost, same output every time. That is
the point — **a fixed procedure run forty times beats a clever paragraph run once.**

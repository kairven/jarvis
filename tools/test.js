#!/usr/bin/env node
/**
 * JARVIS — behavioural test suite (dev-only; never shipped to the browser).
 *
 * Covers what jsdom models faithfully:
 *   • the performance layer: cache, per-tool TTLs, retry, graceful degradation
 *   • telemetry, the in-app diagnostic, home-city preference
 *   • one end-to-end chat turn through the real handler (incl. a cache hit)
 *
 * NOT covered here: strict-mode ReferenceErrors that crash real browsers —
 * jsdom runs inline scripts in sloppy mode and its Window proxy swallows writes
 * to undeclared globals. That class is guarded by tools/check.js (AST).
 *
 * Usage: node tools/test.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const FILE = path.join(__dirname, "..", "index.html");
const HTML = fs.readFileSync(FILE, "utf8");

const WEATHER = {
  current: { temperature_2m: 31.4, relative_humidity_2m: 58, apparent_temperature: 34.1, precipitation: 0, weather_code: 2, wind_speed_10m: 9.2 },
  daily: { time: ["2026-10-24"], weather_code: [2], temperature_2m_max: [33], temperature_2m_min: [22], precipitation_probability_max: [10] },
};

let failures = 0;
function assert(name, cond, extra) {
  if (!cond) failures++;
  console.log((cond ? "PASS" : "FAIL") + " · " + name + (cond ? "" : "  >> " + (extra === undefined ? "" : extra)));
}
function finish() {
  if (failures) {
    console.log("\n✗ " + failures + " assertion(s) failed");
    process.exit(1);
  }
  console.log("\n✓ all assertions passed");
  process.exit(0);
}

async function boot() {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errs.push(e.message));
  const dom = new JSDOM(HTML, { runScripts: "dangerously", url: "https://x.test/", virtualConsole: vc, pretendToBeVisual: true });
  await new Promise((r) => setTimeout(r, 700));
  return { dom, w: dom.window, d: dom.window.document, errs };
}

/* ============ SUITE 1 — performance layer ============ */
async function suitePerf() {
  console.log("\n── SUITE 1 · cache / retry / degradation ──");
  const { w, d, errs } = await boot();
  const J = w.JARVIS;

  let netCalls = 0;
  let mode = "ok";
  w.fetch = async (url) => {
    url = String(url);
    netCalls++;
    if (mode === "offline") throw new TypeError("Failed to fetch");
    if (mode === "503-once" && netCalls === 1) return { ok: false, status: 503, json: async () => ({ error: "overloaded" }), text: async () => "" };
    if (url.includes("geocoding")) return { ok: true, json: async () => ({ results: [{ name: "Kanpur", admin1: "UP", country: "India", latitude: 26.4, longitude: 80.3 }] }), text: async () => "" };
    if (url.includes("open-meteo")) return { ok: true, json: async () => WEATHER, text: async () => "" };
    return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
  };

  /* --- cache --- */
  J.cacheClear();
  const a = await J.runTool("weather", "Kanpur");
  assert("first call hits the network", a.ok && !a.cached && netCalls === 2, JSON.stringify(a).slice(0, 120));

  netCalls = 0;
  const b = await J.runTool("weather", "kanpur");
  assert("second call served from cache", b.ok && b.cached === true && netCalls === 0, "cached=" + b.cached + " net=" + netCalls);
  assert("cached call is instant", b.ms === 0, b.ms + "ms");
  assert("cache key is case-insensitive", J.cacheGet("weather", "Kanpur", 1e9) !== null);

  /* --- TTL expiry --- */
  J.toolCache["weather|kanpur"].t = Date.now() - 60 * 60e3;
  const stale = J.cacheGet("weather", "kanpur", J.TOOL_TTL.weather);
  assert("expired entry is not fresh", stale && stale.fresh === false);
  netCalls = 0;
  const c2 = await J.runTool("weather", "kanpur");
  assert("expired entry refetches live", c2.ok && !c2.cached && netCalls === 2, "cached=" + c2.cached + " net=" + netCalls);

  /* --- side effects are never cached --- */
  ["timer", "remember", "task", "random", "device"].forEach((id) => assert(id + " has no TTL", !J.TOOL_TTL[id]));
  const r1 = (await J.runTool("random", "d6")).out;
  const r2 = (await J.runTool("random", "d6")).out;
  assert("random re-rolls every call", r1 !== "undefined" && r2 !== "undefined", r1 + " / " + r2);

  /* --- retry --- */
  J.cacheClear();
  mode = "503-once";
  netCalls = 0;
  const retried = await J.runTool("weather", "Mumbai");
  assert("transient 503 retried then succeeds", retried.ok && !retried.stale, JSON.stringify(retried).slice(0, 160));
  assert("retry did exactly one extra attempt", netCalls === 3, "net=" + netCalls);
  mode = "ok";

  /* --- graceful degradation --- */
  J.cacheClear();
  await J.runTool("weather", "Delhi");
  const goodOut = J.cacheGet("weather", "Delhi", 1e9).out;
  J.toolCache["weather|delhi"].t = Date.now() - 45 * 60e3;
  mode = "offline";
  const deg = await J.runTool("weather", "Delhi");
  assert("failure falls back to cached data", deg.ok && deg.stale === true, JSON.stringify(deg).slice(0, 160));
  assert("fallback preserves the real payload", deg.out === goodOut);
  assert("fallback reports age and cause", /min/.test(J.ageStr(deg.age)) && /no network connection/.test(deg.error), J.ageStr(deg.age) + " / " + deg.error);
  w.renderMsg("jarvis", "x", [{ id: "weather", args: "Delhi", ok: true, stale: true, ms: 5 }]);
  const chip = d.querySelector("#messages .trace .chip");
  assert("stale chip is amber and labelled", /cached/.test(chip.textContent) && chip.classList.contains("warn"), chip.textContent);

  /* --- honest failure with no cache --- */
  J.cacheClear();
  mode = "offline";
  const hard = await J.runTool("weather", "Nowhere");
  assert("no cache + offline = honest error", !hard.ok && /no network connection/.test(hard.out), hard.out.slice(0, 120));
  mode = "ok";

  /* --- telemetry --- */
  J.cacheClear();
  await J.runTool("weather", "Kanpur");
  await J.runTool("weather", "Kanpur");
  const st = J.toolStats.weather;
  assert("telemetry counts calls", st && st.n >= 2, JSON.stringify(st));
  assert("telemetry counts cache hits", st.cached >= 1, JSON.stringify(st));
  J.renderStats();
  const statsText = d.getElementById("tool-stats").textContent;
  assert("stats panel renders KPIs", /cache hits/i.test(statsText) && /avg latency/i.test(statsText), statsText.slice(0, 80));
  assert("cache hit rate is numeric", typeof J.cacheHitRate() === "number");

  /* --- diagnostic --- */
  J.cacheClear();
  await J.runDiagnostic();
  const diag = d.getElementById("tool-diag").textContent;
  assert("diagnostic reports pass counts", /tools passing/.test(diag) && /avg live latency/.test(diag), diag.slice(0, 120));
  assert("diagnostic reports p95", /p95/.test(diag));

  /* --- home city --- */
  J.cacheClear();
  w.state.homeCity = "Lucknow";
  const seen = [];
  const base = w.fetch;
  w.fetch = async (u) => { seen.push(String(u)); return base(u); };
  const hc = await J.runTool("weather", "");
  assert("empty args reaches the network", hc.ok && seen.length > 0, JSON.stringify(hc).slice(0, 100));
  assert("empty args → home city in request", seen.some((u) => /name=Lucknow/i.test(u)), seen.join(" | ").slice(0, 180));
  w.fetch = base;

  /* --- persistence + clearing --- */
  assert("cache persisted to localStorage", !!w.localStorage.getItem("jarvis_toolcache_v1"));
  J.cacheClear();
  assert("clear empties cache and stats", Object.keys(J.toolCache).length === 0 && Object.keys(J.toolStats).length === 0);
  assert("no uncaught page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
}

/* ============ SUITE 2 — end-to-end chat regression ============ */
async function suiteChat() {
  console.log("\n── SUITE 2 · chat regression (strict-mode + agent loop) ──");
  const { w, d, errs } = await boot();

  w.fetch = async (u) => {
    u = String(u);
    if (u.includes("geocoding")) return { ok: true, json: async () => ({ results: [{ name: "Kanpur", admin1: "UP", country: "India", latitude: 26.4, longitude: 80.3 }] }), text: async () => "" };
    if (u.includes("open-meteo")) return { ok: true, json: async () => WEATHER, text: async () => "" };
    return { ok: false, status: 404, json: async () => ({}), text: async () => "" };
  };

  assert("script ran to completion", !!w.JARVIS && w.TOOLS.length === 22);
  assert("no boot fault banner", !d.getElementById("bootfault"));
  let sp = "";
  try { sp = w.systemPrompt({ query: "x" }); } catch (e) { sp = "THREW " + e.message; }
  assert("systemPrompt builds", /TOOL BELT/.test(sp), sp.slice(0, 80));

  let n = 0;
  w.complete = async () => { n++; return n === 1 ? "[TOOL: weather kanpur]" : "Sir, 31.4°C and partly cloudy in Kanpur."; };
  await w.handleUser("what is the weather in kanpur");
  const txt = d.getElementById("messages").textContent;
  assert("message answered with live data", /31\.4/.test(txt) && !/not defined/i.test(txt), txt.slice(-120));
  assert("tool chip rendered", !!d.querySelector("#messages .trace .chip"));

  let m = 0;
  w.complete = async () => { m++; return m === 1 ? "[TOOL: weather kanpur]" : "Same as before, sir."; };
  await w.handleUser("and tomorrow?");
  assert("repeat question answered via cache", d.querySelectorAll("#messages .trace .chip").length >= 2);
  assert("no uncaught page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
}


/* ============ SUITE 3 — context engine (which data is worth sending) ============ */
async function suiteContext() {
  console.log("\n── SUITE 3 · context engine (BM25 + budgets) ──");
  const { w } = await boot();
  const J = w.JARVIS;
  const st = J.state;

  st.memories = Array.from({ length: 60 }, (_, i) => ({ t: Date.now() - i * 86400e3,
    text: "Fact " + i + ": runs a small business in Kanpur, prefers concise answers, likes tea." }));
  st.tasks = Array.from({ length: 15 }, (_, i) => ({ t: Date.now(), done: false,
    text: "Commitment " + i + ": follow up with the supplier about the invoice" }));
  st.knowledge = Array.from({ length: 5 }, (_, i) => ({ t: Date.now(), title: "Doc " + i,
    text: "Lorem ipsum business plan content. ".repeat(400) }));
  st.board = true;

  /* BM25 sanity */
  const scores = J.bm25("weather kanpur", ["the weather is hot", "business plan", "kanpur weather today"]);
  assert("BM25 ranks the relevant doc first", scores[2] > scores[0] && scores[0] > scores[1], JSON.stringify(scores));

  /* budgets are enforced */
  const big = w.systemPrompt({ query: "what is the weather in kanpur" });
  const small = w.systemPrompt({ query: "hello" });
  assert("a greeting costs fewer tokens than a research question", small.length < big.length, small.length + " vs " + big.length);
  assert("prompt no longer carries all 60 facts", J.lastContext.mem.used < 60, "used " + J.lastContext.mem.used);
  assert("memory block respects its char budget", J.lastContext.mem.chars <= J.CONTEXT_BUDGET.memChars, J.lastContext.mem.chars);
  assert("task block respects its char budget", J.lastContext.task.chars <= J.CONTEXT_BUDGET.taskChars, J.lastContext.task.chars);
  assert("held-back facts are reported", J.lastContext.mem.dropped > 0, J.lastContext.mem.dropped);

  /* progressive disclosure */
  assert("only a few tools are described in full", J.lastContext.tools.full <= J.CONTEXT_BUDGET.toolFull, J.lastContext.tools.full);
  assert("all tools are still listed by id", J.lastContext.tools.ids === J.TOOLS.filter(t => (st.toolsOff||[]).indexOf(t.id) === -1).length);
  assert("menu lists every tool id", /Menu: .*calc/.test(big) && /Menu: .*device/.test(big));
  const cats = await J.runTool("tools", "");
  assert("the catalogue escape hatch works", cats.ok && /LIVE TOOL BELT/.test(cats.out), cats.out.slice(0, 60));

  /* knowledge relevance floor: an unrelated question drags nothing in */
  const relWeather = J.retrieveKnowledge("what is the weather in kanpur");
  const relBiz = J.retrieveKnowledge("business plan content");
  assert("unrelated query retrieves no documents", relWeather === null, JSON.stringify(relWeather));
  assert("related query retrieves a document", relBiz && relBiz.docs >= 1, JSON.stringify(relBiz).slice(0, 80));

  /* history budget */
  st.chat = Array.from({ length: 20 }, (_, i) => ({ r: i % 2 ? "jarvis" : "user", c: "x".repeat(1200), t: Date.now() }));
  const before = st.chat.length;
  let captured = null;
  w.complete = async (msgs) => { captured = msgs; return "ok"; };
  await w.handleUser("and now?");
  const histMsgs = captured.filter(m => m.role === "user" || m.role === "assistant");
  assert("history is capped by characters, not message count", histMsgs.length < before, histMsgs.length + " msgs");
  assert("history stays inside its budget", J.lastContext.hist.chars <= J.CONTEXT_BUDGET.histChars + 1200, J.lastContext.hist.chars);

  /* the inspector renders the decision */
  J.renderContext();
  const panel = w.document.getElementById("ctx-panel").textContent;
  assert("inspector shows held-back counts", /held back/i.test(panel) && /prompt tokens/i.test(panel), panel.slice(0, 100));
  assert("inspector shows persistence state", /saving|NOT SAVING/.test(panel));
}

/* ============ SUITE 4 — audit fixes ============ */
async function suiteAuditFixes() {
  console.log("\n── SUITE 4 · audit fixes ──");
  const { w, d } = await boot();
  const J = w.JARVIS;

  /* save() must report failure instead of swallowing it.
     NB: jsdom's Storage is a Proxy — assigning localStorage.setItem writes an
     item, it does not replace the method. Patch the prototype. */
  const realSet = w.Storage.prototype.setItem;
  w.Storage.prototype.setItem = function(){ throw new Error("QuotaExceededError"); };
  J.state.memories.push({ text: "test", t: Date.now() });
  const saveFn = w.eval("save");
  try { saveFn(); } catch (e) {}
  const u = J.storageUse();
  assert("failed save is detected", u.ok === false, JSON.stringify(u));
  w.Storage.prototype.setItem = realSet;
  const u2 = (saveFn(), J.storageUse());
  assert("save recovers once storage works again", u2.ok === true, JSON.stringify(u2));

  /* wipe clears cached tool data too */
  J.cachePut("weather", "Delhi", "old cached weather");
  assert("cache populated before wipe", Object.keys(J.toolCache).length > 0);
  w.confirm = () => true;
  w.eval("wipeAll")();
  assert("wipe clears the tool cache", Object.keys(J.toolCache).length === 0, JSON.stringify(Object.keys(J.toolCache)));

  /* a corrupt backup must not break the UI */
  const file = new w.File([JSON.stringify({ memories: null, tasks: "nope", chat: 5 })], "bad.json", { type: "application/json" });
  const input = d.getElementById("import-file");
  Object.defineProperty(input, "files", { value: [file], configurable: true });
  w.eval("importData")({ target: input });
  await new Promise(r => setTimeout(r, 200));
  assert("corrupt backup rejected, state stays valid", Array.isArray(J.state.memories) && Array.isArray(J.state.tasks));

  /* dead code removed */
  const js = w.document.querySelector("script").textContent;
  assert("unused peek() helper is gone", !/function peek\(/.test(js));
}

/* ============ SUITE 5 — skills & teachings ============ */
async function suiteSkills() {
  console.log("\n── SUITE 5 · skills & teachings ──");
  const { w, d } = await boot();
  const J = w.JARVIS;

  assert("22 skills available", J.SKILLS.length === 22, J.SKILLS.length);
  assert("12 built-in teachings", J.TEACHINGS.length === 12, J.TEACHINGS.length);

  const cases = [
    ["my code crashes with this error", "debug"],
    ["how do I prepare for my exam", "study"],
    ["should I raise my price", "money"],
    ["help me negotiate a salary offer", "negotiate"],
  ];
  cases.forEach(([q, want]) => {
    const got = J.matchSkills(q, 2).map((x) => x.skill.id);
    assert('skill match: "' + q + '" → ' + want, got.includes(want), JSON.stringify(got));
  });
  assert("a plain lookup matches no skill", J.matchSkills("what is the weather in kanpur", 2).length === 0);

  /* the tokenizer must handle plurals and ignore stopwords */
  assert("plural matches singular (crashes → crash)",
    J.matchSkills("crashes", 2).some((x) => x.skill.id === "debug"));
  assert("stopwords do not create false matches",
    J.matchSkills("what is the", 2).length === 0);

  /* teachings */
  assert("teaching retrieved for tokenization",
    J.matchTeachings("how does a tokenizer split hindi words", 1).map((x) => x.doc.id).includes("tokens"));
  assert("no teaching for an unrelated question",
    J.matchTeachings("what is the weather in kanpur", 1).length === 0);

  /* prompt: only matched skills, inside budget */
  const sp = w.systemPrompt({ query: "my python code keeps crashing with an error" });
  assert("matched skill lands in the prompt", /ACTIVE SKILLS/.test(sp) && /Debugging/.test(sp));
  assert("all 22 skills are NOT sent", (sp.match(/### /g) || []).length < 8, (sp.match(/### /g) || []).length + " headings");
  assert("skill block respects its budget", J.lastContext.skills.chars <= J.CONTEXT_BUDGET.skillChars, J.lastContext.skills.chars);

  /* teaching him directly */
  const r = J.teachLesson("Our cheapest plan is Rs 499 per month and we never discount it.");
  assert("teachLesson stores a note", r.ok && w.state.lessons.length === 1, JSON.stringify(r));
  assert("duplicate note rejected", !J.teachLesson("Our cheapest plan is Rs 499 per month and we never discount it.").ok);
  assert("too-short note rejected", !J.teachLesson("hi").ok);
  const sp3 = w.systemPrompt({ query: "can I discount the cheapest plan for a client" });
  assert("taught note retrieved when relevant", /499/.test(sp3));

  /* UI + commands */
  J.renderSkills();
  assert("skills list renders", d.querySelectorAll("#skills-list .skill-row").length === 22);
  await J.slashTool("/skills");
  assert("/skills lists the catalogue", /SKILLS/.test(d.getElementById("messages").textContent));
  await J.slashTool("/debug");
  assert("/debug shows the procedure", /Debugging/.test(d.getElementById("messages").textContent));
  const before = w.state.lessons.length;
  await J.slashTool("/teach Never promise a delivery date before the supplier confirms.");
  assert("/teach works from chat", w.state.lessons.length === before + 1);

  /* disabling takes effect */
  w.state.skillsOff = ["debug"];
  assert("disabled skill is not matched", !J.matchSkills("my code crashes", 2).some((x) => x.skill.id === "debug"));
  w.state.skillsOff = [];
}


/* ============ SUITE 6 — voice, wake word, live data ============ */
async function suiteVoice() {
  console.log("\n── SUITE 6 · voice + wake word + live data ──");
  const WEATHER = { current:{temperature_2m:31.4,relative_humidity_2m:58,apparent_temperature:34.1,precipitation:0,weather_code:2,wind_speed_10m:9.2},
    daily:{time:["2026-10-24"],weather_code:[2],temperature_2m_max:[33],temperature_2m_min:[22],precipitation_probability_max:[10]} };
  let fake = null;
  const errs = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errs.push(e.message));
  const dom = new JSDOM(HTML, { runScripts:"dangerously", url:"https://x.test/", virtualConsole:vc, pretendToBeVisual:true,
    beforeParse(w){
      w.isSecureContext = true;
      class FakeSR {
        constructor(){ fake = this; this.started = false; }
        start(){ if(this.started) throw new Error("already started"); this.started = true; if(this.onstart) this.onstart(); }
        stop(){ this.started = false; if(this.onend) this.onend(); }
        abort(){ this.started = false; }
      }
      w.SpeechRecognition = FakeSR;
      w.speechSynthesis = { getVoices:()=>[], speak(){}, cancel(){} };
      w.SpeechSynthesisUtterance = function(t){ this.text = t; };
    }});
  const w = dom.window, d = w.document;
  await new Promise(r => setTimeout(r, 700));
  const J = w.JARVIS;
  const say = (txt) => fake.onresult({ resultIndex:0, results:[{ isFinal:true, 0:{ transcript:txt }, length:1 }] });

  /* wake-word parsing */
  assert('wake: "hey jarvis, ..." strips the wake word', J.stripWakeWord("hey jarvis, what's the weather") === "what's the weather");
  assert('wake: "jarvis ..." works without "hey"', J.stripWakeWord("Jarvis what is BTC") === "what is BTC");
  assert("wake: no wake word returns null", J.stripWakeWord("just chatting") === null);
  assert("wake: bare wake word leaves an empty command", J.stripWakeWord("hey jarvis") === "");
  assert("wake: the acronym works", J.stripWakeWord("hey j.a.r.v.i.s. status") === "status");

  /* engine + buttons */
  assert("speech engine detected", J.voiceSupported() === true);
  assert("no setup blocker on https", J.voiceSetupHint() === "", J.voiceSetupHint());
  assert("microphone button visible", d.getElementById("mic-btn").style.display !== "none");
  assert("wake button visible", d.getElementById("wake-btn").style.display !== "none");

  /* network stubs */
  w.fetch = async (u) => { u = String(u);
    if(u.includes("geocoding")) return { ok:true, json:async()=>({results:[{name:"Kanpur",admin1:"UP",country:"India",latitude:26.4,longitude:80.3}]}), text:async()=>"" };
    if(u.includes("open-meteo")) return { ok:true, json:async()=>WEATHER, text:async()=>"" };
    if(u.includes("coingecko")) return { ok:true, json:async()=>({bitcoin:{usd:67000,inr:5639000,usd_24h_change:2.1,usd_market_cap:1.3e12}}), text:async()=>"" };
    if(u.includes("r.jina.ai")) return { ok:true, json:async()=>({}), text:async()=>"Bitcoin is trading at sixty seven thousand dollars today according to live market data." };
    return { ok:false, status:404, json:async()=>({}), text:async()=>"" }; };

  /* auto live */
  const pl = await J.prefetchLive("what is the weather in Kanpur");
  assert("live data prefetched for a weather question", /LIVE DATA/.test(pl) && /31\.4/.test(pl));
  const pc = await J.prefetchLive("what is bitcoin at right now");
  assert("live data prefetched for a price question", /crypto/.test(pc) && /67,000|67000/.test(pc));
  assert("small talk prefetches nothing", (await J.prefetchLive("hello jarvis how are you")) === "");
  const sr = await J.doSearch("bitcoin price today");
  assert("search returns real result text (not just an instant answer)", /Web results/.test(sr) && /sixty seven thousand/.test(sr));

  /* end-to-end wake flow */
  J.startVoice(true);
  await new Promise(r => setTimeout(r, 50));
  assert("wake mode engaged", J.voiceMode === "wake", J.voiceMode);
  assert("status pill shows the wake word", /hey jarvis/.test(d.getElementById("voice-state").textContent));

  let calls = [];
  w.complete = async (msgs) => { calls.push(msgs); return "Sir, it is 31.4°C in Kanpur."; };
  say("hey jarvis what is the weather in kanpur");
  await new Promise(r => setTimeout(r, 400));
  assert("wake word produced a real answer", /31\.4/.test(d.getElementById("messages").textContent));
  assert("live data reached the model call", calls.some(m => m.some(x => /LIVE DATA/.test(String(x.content || "")))));
  assert("auto-send cleared the input", d.getElementById("input").value === "");

  /* no echo loop, no false wakes */
  calls = [];
  w.speakUntil = Date.now() + 5000;
  say("hey jarvis tell me a joke");
  await new Promise(r => setTimeout(r, 250));
  assert("ignores speech while it is speaking (no echo loop)", calls.length === 0, calls.length);
  w.speakUntil = 0;
  calls = [];
  const before = d.getElementById("messages").textContent.length;
  say("the weather outside is nice today");
  await new Promise(r => setTimeout(r, 250));
  assert("ignores speech without the wake word", calls.length === 0 && d.getElementById("messages").textContent.length === before);

  J.stopVoice();
  assert("stop returns to idle", J.voiceMode === "idle" && fake.started === false, J.voiceMode);
  assert("no page errors from voice", errs.length === 0, errs.slice(0, 2).join(" | "));
}

/* ============ SUITE 7 — Kairven international kit ============ */
async function suiteKairven() {
  console.log("\n── SUITE 7 · Kairven intl kit ──");
  const { w, d } = await boot();
  const J = w.JARVIS;

  /* the four new procedures exist and are retrievable by plain language */
  ["intl-sales", "leak-audit", "sow", "outreach-law"].forEach((id) => {
    assert("skill present: " + id, J.SKILLS.some((x) => x.id === id));
  });
  const intl = J.matchSkills("i want international clients in dubai and london", 3).map((x) => x.skill.id);
  assert("timezone question pulls the intl-sales procedure", intl.includes("intl-sales"), JSON.stringify(intl));
  const legal = J.matchSkills("can i cold email a clinic in germany", 3).map((x) => x.skill.id);
  assert("jurisdiction question pulls the outreach-law procedure", legal.includes("outreach-law"), JSON.stringify(legal));

  /* the procedure must carry the constraint that actually gates the plan */
  const body = J.SKILLS.find((x) => x.id === "intl-sales").body;
  assert("intl-sales names the timezone trap", /New York|timezone/i.test(body));
  assert("intl-sales sequences UAE before the US", body.indexOf("Dubai") < body.indexOf("US"));

  /* /leak builds a real worksheet, not a pep talk */
  await J.slashTool("/leak Smile Dental, Dubai");
  let out = d.getElementById("messages").textContent;
  assert("/leak acknowledges the target", /Smile Dental, Dubai/.test(out));
  const cells = Array.from(d.querySelectorAll("#messages table td")).map((c) => c.textContent);
  const named = ["Answer speed", "Voicemail", "WhatsApp", "Booking path", "After hours",
                 "Google listing", "Review velocity", "Mobile site", "Real proof"];
  const missing = named.filter((n) => !cells.includes(n));
  assert("/leak has all nine named checks", missing.length === 0, "missing: " + missing.join(", "));
  assert("/leak gives a score threshold", /0–2/.test(out) && /6\+/.test(out));
  assert("/leak refuses to invent a loss figure", /never claim a revenue loss/i.test(out));

  /* /proposal scaffolds the offer in the buyer's currency */
  await J.slashTool("/proposal Smile Dental | missed calls after 7pm");
  out = d.getElementById("messages").textContent;
  assert("/proposal uses the client name", /Proposal — Smile Dental/.test(out));
  assert("/proposal carries the stated problem", /missed calls after 7pm/.test(out));
  assert("/proposal quotes the Gulf price in dirhams", /AED 1,499/.test(out));
  assert("/proposal quotes the UK price in pounds", /£329/.test(out));
  assert("/proposal keeps unknown numbers as brackets", /\[their average value\]/.test(out));
  assert("/proposal warns to delete brackets", /Delete every \[bracket\]/.test(out));

  /* empty args must teach the syntax, not throw */
  await J.slashTool("/leak");
  assert("/leak without a name still works", /the business/.test(d.getElementById("messages").textContent));
  await J.slashTool("/proposal");
  assert("/proposal without args prints usage", /Usage:/.test(d.getElementById("messages").textContent));

  /* friendly aliases route to the real procedure */
  await J.slashTool("/international");
  assert("/international resolves to intl-sales", /Selling abroad/.test(d.getElementById("messages").textContent));
  await J.slashTool("/legal");
  assert("/legal resolves to outreach-law", /Cold outreach law/.test(d.getElementById("messages").textContent));

  /* welcome teaches the new commands */
  w.clearChat && null;
  d.getElementById("messages").innerHTML = "";
  w.welcome();
  const wl = d.getElementById("messages").textContent;
  assert("welcome advertises /leak", /\/leak/.test(wl));
  assert("welcome advertises /proposal", /\/proposal/.test(wl));
  assert("welcome counts 22 skills", /22 skills/.test(wl));
  assert("welcome reports the current version", /v4\.6/.test(wl), wl.slice(0, 80));
  assert("welcome advertises /brain", /\/brain/.test(wl));
  assert("welcome advertises /accent", /\/accent/.test(wl));
  assert("welcome does not claim 18 skills", !/18 skills/.test(wl));
}

/* ============ SUITE 8 — brain recovery, self-knowledge, accents ============ */
async function suiteRepair() {
  console.log("\n── SUITE 8 · brain / self-knowledge / accent ──");
  const { w, d } = await boot();
  const J = w.JARVIS;

  /* --- the free brain points at the endpoint that still exists --- */
  const poll = J.PROVIDERS.find((p) => p.id === "pollinations");
  assert("free brain uses the current /v1/chat/completions path", /\/v1\/chat\/completions$/.test(poll.url), poll.url);
  assert("free brain names a model the tier still lists", poll.model === "openai-fast", poll.model);
  assert("free brain is no longer on the deprecated /openai path", !/\/openai$/.test(poll.url), poll.url);

  /* --- the GET fallback cannot 404 on URL length any more --- */
  const big = [{ role: "system", content: "x".repeat(4000) }, { role: "user", content: "y".repeat(4000) }];
  const cp = J.compactPrompt(big, 900);
  assert("compact fallback prompt is capped", cp.length <= 900, cp.length);
  assert("compact fallback strips URLs", !/https?:\/\//.test(J.compactPrompt([{ role: "user", content: "see https://example.com/a/very/long/url" }], 900)));

  let tried = [];
  w.fetch = async (u) => { tried.push(String(u));
    if (/^https:\/\/text\.pollinations\.ai\/(?!openai|v1)/.test(String(u))) return { ok: true, text: async () => "recovered answer", json: async () => ({}) };
    return { ok: false, status: 404, text: async () => "nope", json: async () => ({}) };
  };
  const got = await J.pollinationsFallback([{ role: "user", content: "Question" }], null);
  assert("GET fallback recovers a real answer", got === "recovered answer", got);
  assert("GET fallback no longer appends a dead ?model=", tried.every((u) => !/\?model=/.test(u)), tried[0]);

  /* --- malformed payloads now explain themselves --- */
  w.fetch = async () => ({ ok: true, status: 200, text: async () => "<html>gateway error</html>", json: async () => null });
  let msg = "";
  try { await J.postJSON("https://text.pollinations.ai/v1/chat/completions", {}, { messages: [] }); }
  catch (e) { msg = e.message; }
  assert("malformed response reports the host", /text\.pollinations\.ai/.test(msg), msg);
  assert("malformed response quotes what came back", /gateway error/.test(msg), msg);

  /* --- the exact failure from the transcript, answered honestly --- */
  const noRes = J.noLiveResults("kairven");
  assert("no-result reply names the query", /kairven/.test(noRes));
  assert("no-result reply refuses to guess", /will not guess/i.test(noRes), noRes.slice(0, 80));
  assert("no-result reply offers /read", /\/read/.test(noRes));

  /* --- self-knowledge: the questions that used to be answered by a brain --- */
  const selfQ = J.selfAnswer("I want you to when I say hey Jarvis you wake up");
  assert("wake-word request is answered by the app", /Wake word/i.test(selfQ), selfQ.slice(0, 60));
  assert("wake-word answer points at the 💤 button", /💤/.test(selfQ));
  const voiceQ = J.selfAnswer("why is your voice is not working");
  assert("voice complaint is answered by the app", /Web Speech/i.test(voiceQ), voiceQ.slice(0, 60));
  assert("voice answer refuses the PyAudio myth", /no PyAudio|not a Python console/i.test(voiceQ));
  const active = J.selfAnswer("active voice command");
  assert("\"active voice command\" no longer reaches the brain", /Voice|Speech/i.test(active), active.slice(0, 60));
  const brainQ = J.selfAnswer("check brain is working or not");
  assert("brain check is answered with a real table", /BRAIN STATUS/.test(brainQ), brainQ.slice(0, 60));
  const failQ = J.selfAnswer("why system fail");
  assert("\"why system fail\" explains the actual fault", /WHY IT FAILED/.test(failQ), failQ.slice(0, 60));

  /* --- and it stays out of the way of real questions --- */
  assert("a normal question is not hijacked", J.selfAnswer("what is the weather in kanpur") === "");
  assert("a wake-word command is not hijacked", J.selfAnswer("hey jarvis what is the weather") === "");
  assert("a business question is not hijacked", J.selfAnswer("how do I price my leak audit for a clinic") === "");

  /* --- accents --- */
  assert("five accents are offered", Object.keys(J.ACCENTS).length === 5);
  assert("default accent is British (he asked for a different accent)", J.accentKey() === "british", J.accentKey());
  J.setAccent("indian");
  assert("setAccent changes the accent", J.accentKey() === "indian");
  assert("setAccent moves voice recognition too", J.state.voiceLang === "en-IN", J.state.voiceLang);
  J.setAccent("american");
  assert("setAccent is re-runnable", J.state.speakLang === "en-US", J.state.speakLang);
  assert("an unknown accent is refused", J.setAccent("martian") === false);
  const acc = J.accentStatus();
  assert("accent status names the current accent", /American English/.test(acc), acc.slice(0, 80));
  assert("accent status explains how to change it", /\/accent british/.test(acc));

  /* --- /accent and /brain and /retry from chat --- */
  const say = async (t) => { await J.slashTool(t); return d.getElementById("messages").textContent; };
  let out = await say("/accent british");
  assert("/accent works from chat", /British English/.test(out.slice(-900)), out.slice(-160));
  out = await say("/accent list");
  assert("/accent list explains an empty voice list instead of crashing", /voices|voice/i.test(out.slice(-300)));
  out = await say("/brain");
  assert("/brain prints the status table", /BRAIN STATUS/.test(out.slice(-600)));
  assert("/brain shows the free brain", /Pollinations/.test(out.slice(-600)));

  /* --- /retry replays the last real question --- */
  let calls = 0;
  J.state.autoLearn = false;               /* isolate the chat call from background learning */
  w.complete = async () => { calls++; return "retried"; };
  await J.handleUser("hello there jarvis");
  const afterFirst = calls;
  await J.slashTool("/retry");
  assert("/retry actually re-sends the previous question", calls === afterFirst + 1, calls + " vs " + afterFirst);
}


(async () => {
  await suitePerf();
  await suiteChat();
  await suiteContext();
  await suiteAuditFixes();
  await suiteSkills();
  await suiteVoice();
  await suiteKairven();
  await suiteRepair();
  finish();
})().catch((e) => {
  console.log("FAIL · suite crashed: " + (e && e.stack ? e.stack : e));
  process.exit(1);
});

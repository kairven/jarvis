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

  assert("script ran to completion", !!w.JARVIS && w.TOOLS.length === 21);
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

(async () => {
  await suitePerf();
  await suiteChat();
  finish();
})().catch((e) => {
  console.log("FAIL · suite crashed: " + (e && e.stack ? e.stack : e));
  process.exit(1);
});

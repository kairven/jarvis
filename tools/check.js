#!/usr/bin/env node
/**
 * JARVIS — pre-flight check for index.html (dev-only, not used by the app).
 *
 * Why this exists: index.html is one big inline script that starts with
 * "use strict". In a real browser, assigning to an undeclared name throws
 * ReferenceError *at load time* and silently kills the rest of the script —
 * the UI still paints, inline onclick handlers still fire, but half the app is
 * dead. jsdom does NOT reproduce this (its Window proxy swallows the write),
 * so unit tests pass while Chrome crashes. This checker catches that class.
 *
 * Usage: node tools/check.js [index.html]
 */
"use strict";

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const walk = require("acorn-walk");

const file = process.argv[2] || path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(file, "utf8");

const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) {
  console.log("FAIL · no inline <script> found in " + file);
  process.exit(1);
}
const js = scripts.join("\n;\n");

/* 1. syntax */
let ast;
try {
  ast = acorn.parse(js, { ecmaVersion: 2022, sourceType: "script", locations: true });
} catch (e) {
  console.log("FAIL · syntax error: " + e.message);
  process.exit(1);
}
console.log("PASS · parses cleanly (" + js.length.toLocaleString("en-US") + " chars of JS)");

/* 2. strict-mode hazards: assignment to a name declared nowhere */
const BROWSER_GLOBALS = new Set([
  "window", "document", "navigator", "location", "localStorage", "sessionStorage", "console", "fetch",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "crypto", "FileReader", "Blob", "URL", "File",
  "FormData", "Notification", "SpeechSynthesisUtterance", "speechSynthesis", "HTMLElement", "Image", "AbortController",
  "TextEncoder", "TextDecoder", "Event", "CustomEvent", "requestAnimationFrame", "alert", "confirm", "prompt",
  "screen", "history", "performance", "atob", "btoa", "Uint32Array", "Uint8Array", "Array", "Object", "JSON", "Math",
  "String", "Number", "Boolean", "Promise", "Error", "TypeError", "Date", "RegExp", "Map", "Set", "WeakMap", "isNaN",
  "parseInt", "parseFloat", "encodeURIComponent", "decodeURIComponent", "Intl", "self", "caches", "indexedDB",
  "undefined", "NaN", "Infinity", "arguments", "eval", "Function",
]);

const declared = new Set();
walk.full(ast, (node) => {
  const add = (id) => { if (id && id.type === "Identifier") declared.add(id.name); };
  if (node.type === "VariableDeclarator") add(node.id);
  if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
    add(node.id);
    (node.params || []).forEach((p) => {
      add(p);
      if (p.type === "AssignmentPattern") add(p.left);
      if (p.type === "RestElement") add(p.argument);
    });
  }
  if (node.type === "ClassDeclaration" || node.type === "ClassExpression") add(node.id);
  if (node.type === "CatchClause") add(node.param);
});

const hazards = [];
walk.full(ast, (node) => {
  const check = (id) => {
    if (!id || id.type !== "Identifier") return;
    if (declared.has(id.name) || BROWSER_GLOBALS.has(id.name)) return;
    hazards.push({ name: id.name, line: node.loc.start.line });
  };
  if (node.type === "AssignmentExpression" && node.left.type === "Identifier") check(node.left);
  if (node.type === "UpdateExpression" && node.argument.type === "Identifier") check(node.argument);
  if ((node.type === "ForInStatement" || node.type === "ForOfStatement") && node.left.type === "Identifier") check(node.left);
});

const uniq = [...new Map(hazards.map((h) => [h.name, h])).values()];
if (uniq.length) {
  console.log("FAIL · undeclared assignment(s) — these throw ReferenceError in real browsers:");
  uniq.forEach((h) => console.log("   line " + h.line + ": " + h.name + "  → use var/let/const"));
  process.exit(1);
}
console.log("PASS · no strict-mode hazards (" + declared.size + " declared names)");

/* 3. the app's own wiring must be present */
const required = ["TOOLS", "runTool", "agentRun", "systemPrompt", "handleUser", "slashTool"];
const missing = required.filter((n) => !new RegExp("\\b" + n + "\\b").test(js));
if (missing.length) {
  console.log("FAIL · missing expected symbols: " + missing.join(", "));
  process.exit(1);
}
console.log("PASS · expected subsystems present");

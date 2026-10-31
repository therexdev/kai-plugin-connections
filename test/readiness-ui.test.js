"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../plugin/connections.js"), "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture(section = "explore") {
  const handlers = {}, calls = [], navigated = [], notices = { textContent: "", classList: { toggle() {} } }, readiness = { innerHTML: "" }, managed = { textContent: "" };
  let state = { composio: { mode: "managed", managedAvailable: null, signedIn: false }, connections: [] }, finish;
  let probe = () => new Promise(resolve => { finish = resolve; });
  const nodes = { ".cn-main": {}, "#cn-apps": {}, "#cn-count": {}, "#cn-more": {}, "#cn-managed-status": managed };
  const host = { innerHTML: "", isConnected: true, getClientRects: () => [{}], querySelector: selector => nodes[selector] || null,
    querySelectorAll: selector => selector === "[data-cn-readiness]" ? [readiness] : selector === ".cn-notice" ? [notices] : [], addEventListener(name, handler) { handlers[name] = handler; } };
  const window = { KaiConnectionCatalog: { items: [], categories: [] }, selectAccountScope: async value => { navigated.push(value); } };
  vm.runInNewContext(source, { window, document: { addEventListener() {} }, AbortController, setTimeout, clearTimeout,
    KaiI18n: { html: (parts, ...values) => typeof parts === "string" ? parts : parts.reduce((s, p, i) => s + p + (values[i] ?? ""), ""), message: (parts, ...values) => parts.reduce((s, p, i) => s + p + (values[i] ?? ""), ""), setText: (el, value) => { el.textContent = value; } } });
  window.KaiConnections.render(host, { section, state, manage: async action => { calls.push(action); if (action === "composioRefresh") return probe(); if (action === "status") return state; throw Error(action); }, navigate() {} });
  return { readiness, managed, notices, calls, navigated, complete: async next => { state = { ...state, composio: { ...state.composio, ...next } }; finish(); await tick(); },
    fail: message => { probe = async () => { state = { ...state, composio: { ...state.composio, managedAvailable: null, managedError: message } }; throw Error(message); }; },
    retry: next => { probe = async () => { state = { ...state, composio: { ...state.composio, managedError: null, ...next } }; }; },
    click: name => handlers.click({ target: { closest: () => ({ dataset: { cn: name }, disabled: false }) } }) };
}
test("signed-out availability resolves to account sign-in and opens the website account once", async () => {
  const f = fixture(); assert.match(f.readiness.innerHTML, /Checking KAI-managed/);
  await f.complete({ managedAvailable: true });
  assert.match(f.readiness.innerHTML, /Sign in to KAI to connect apps/); assert.doesNotMatch(f.readiness.innerHTML, /Checking KAI-managed/);
  await f.click("signin"); assert.deepEqual(f.navigated, [true]);
});
test("a rejected refresh retrieves final status, replaces Checking with retry guidance, and can recover", async () => {
  const f = fixture(); await f.complete({ managedAvailable: true });
  f.fail("The KAI connection server returned HTTP 503. Try again shortly."); await f.click("refresh");
  assert.match(f.readiness.innerHTML, /Couldn&#39;t check KAI-managed connections/); assert.match(f.readiness.innerHTML, /HTTP 503/);
  assert.doesNotMatch(f.readiness.innerHTML, /Checking KAI-managed/); assert.match(f.notices.textContent, /HTTP 503/);
  assert.deepEqual(f.calls, ["composioRefresh", "status", "composioRefresh", "status"]);
  f.retry({ managedAvailable: true }); await f.click("refresh"); assert.match(f.readiness.innerHTML, /Sign in to KAI to connect apps/); assert.equal(f.notices.textContent, "");
});
test("setup status settles on failures and expired sign-in has a direct recovery action", async () => {
  const f = fixture("setup"); await f.complete({ managedAvailable: null, managedError: "The KAI connection server could not be reached." });
  assert.equal(f.managed.textContent, "The KAI connection server could not be reached.");
  assert.doesNotMatch(f.readiness.innerHTML, /Checking/);
  f.retry({ managedAvailable: true, sessionExpired: true }); await f.click("refresh");
  assert.match(f.readiness.innerHTML, /Sign in to KAI again/); assert.match(f.readiness.innerHTML, /data-cn="signin"/);
});

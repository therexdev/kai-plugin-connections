"use strict";
const localeFixture = require("./i18n-fixture");
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../plugin/companion-hub.js"), "utf8");
function fixture() {
  const calls = [], handlers = {}, reviews = []; let answer;
  const state = { models: [], notes: [], goals: [], sources: [], workflows: [], connections: [], templates: [], runs: [] };
  const out = {}, message = { textContent: "", classList: { toggle() {} } };
  const host = { hidden: true, innerHTML: "", querySelector: selector => selector === ".hub-content" ? out : selector === ".hub-notice" ? message : null };
  const window = { KaiBrain: { render() {} }, KaiCompanionClient: { checked: async value => value }, kaiCompanionBridge: { async manage(action, input) { calls.push({ action, input }); return action === "status" ? state : {}; } }, kai: { dialogs: { confirm(message) { reviews.push(message); return new Promise(resolve => { answer = resolve; }); } } } };
  const context = { window, document: { getElementById: () => host, addEventListener(name, handler) { handlers[name] = handler; } }, KaiI18n: localeFixture, setTimeout: () => 0, clearTimeout() {} };
  vm.runInNewContext(source, context);
  const button = { disabled: false, dataset: { hubAction: "deleteNote", id: "reviewed-id" }, closest: () => host };
  return { window, calls, reviews, button, answer: value => answer(value), click: () => handlers.click({ target: { closest: () => button } }) };
}
test("removing saved content waits for the styled decision and Cancel makes no change", async () => {
  const f = fixture(); await f.window.KaiCompanionHub.render("brain");
  const pending = f.click(); assert.equal(f.reviews.length, 1); assert.equal(f.button.disabled, true); assert.deepEqual(f.calls.map(c => c.action), ["status"]);
  f.answer(false); await pending; assert.deepEqual(f.calls.map(c => c.action), ["status"]); assert.equal(f.button.disabled, false);
  const approved = f.click(); assert.equal(f.calls.length, 1); f.answer(true); await approved;
  assert.deepEqual(f.calls.map(c => c.action), ["status", "remove", "status"]);
  assert.equal(f.calls[1].input.id, "reviewed-id"); assert.equal(f.calls[1].input.kind, "notes");
});
test("a second click cannot approve or remove another item while review is pending", async () => {
  const f = fixture(); await f.window.KaiCompanionHub.render("brain"); const pending = f.click();
  f.button.dataset.id = "another-id"; await f.click(); assert.equal(f.reviews.length, 1);
  f.answer(true); await pending; assert.equal(f.calls.find(c => c.action === "remove").input.id, "reviewed-id");
});

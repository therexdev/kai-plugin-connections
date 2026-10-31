"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { fixture } = require("./helper"), { create } = require("../plugin/service");
const response = (value, status = 200) => new Response(JSON.stringify(value), { status });
const available = { available: true, protocol: 1, generation: "project-one" };
function setup(t, signedIn = false) {
  const f = fixture(t, "kai.connections"), publicCalls = [], privateCalls = [];
  let account = { origin: "https://accounts.example.com", signedIn, binding: "session-one" };
  f.api.network.fetch = async (url, options) => { publicCalls.push({ url, options }); return response(available); };
  f.api.account = {
    status: () => account,
    async request(route, options) {
      privateCalls.push({ route, options });
      if (!account.signedIn) throw Error("Sign in to your KAI account first");
      return response({ ok: true, result: { userId: "managed-user", accounts: [] } });
    },
  };
  const app = create(f.api); t.after(() => app.dispose());
  return { ...f, app, publicCalls, privateCalls, account: value => { account = { ...account, ...value }; },
    refresh: () => app.call("connections.ui.composioRefresh"), status: async () => (await app.call("connections.ui.status")).composio };
}
test("signed-out managed availability uses the public broker and requires no account token", async t => {
  const f = setup(t); await f.refresh();
  assert.equal(f.publicCalls.length, 1); assert.equal(f.privateCalls.length, 0);
  assert.equal(f.publicCalls[0].url, "https://accounts.example.com/connections/status");
  assert.equal(f.publicCalls[0].options.method, "GET"); assert.equal(f.publicCalls[0].options.headers, undefined);
  assert.equal(f.publicCalls[0].options.body, undefined);
  const s = await f.status(); assert.equal(s.managedAvailable, true); assert.equal(s.managedError, null); assert.equal(s.signedIn, false);
  f.account({ signedIn: true }); await f.refresh();
  assert.deepEqual(f.privateCalls.map(c => c.route), ["/connections/api/accounts"]);
  assert.equal(f.privateCalls[0].options.body.generation, "project-one");
});
test("failed public checks settle with an honest error, preserve saved accounts, and recover on retry", async t => {
  const f = setup(t);
  const saved = await f.app.call("connections.save", { name: "Saved API", baseUrl: "https://api.example.com", auth: "bearer", secret: "synthetic-secret", operations: [{ id: "read", name: "Read", method: "GET", path: "/items" }] });
  f.api.network.fetch = async () => { throw Error("Internal transport details"); };
  await assert.rejects(f.refresh(), /KAI connection server could not be reached/);
  const failed = await f.status(); assert.equal(failed.managedAvailable, null); assert.match(failed.managedError, /could not be reached/);
  assert.doesNotMatch(failed.managedError, /internet|Internal transport/);
  assert.equal((await f.app.call("connections.ui.status")).connections[0].id, saved.id);
  f.api.network.fetch = async () => response(available); await f.refresh();
  assert.equal((await f.status()).managedError, null); assert.equal((await f.status()).managedAvailable, true);
});
test("disabled, missing, HTTP error, invalid, oversized, and unsupported status responses stay distinct", async t => {
  const f = setup(t);
  for (const [result, expected] of [
    [() => response({ ...available, available: false }), false], [() => response({}, 404), false],
    [() => response({}, 503), /HTTP 503/], [() => new Response("<html>error</html>"), /unreadable/],
    [() => response({ ...available, protocol: 2 }), /unsupported/],
    [() => response({ ...available, available: "true" }), /unsupported/],
    [() => new Response("x".repeat(65537)), /invalid status/],
  ]) {
    f.api.network.fetch = async () => result();
    if (expected === false) { await f.refresh(); assert.equal((await f.status()).managedAvailable, false); assert.equal((await f.status()).managedError, null); }
    else { await assert.rejects(f.refresh(), expected); assert.match((await f.status()).managedError, expected); }
  }
});
test("changing account servers invalidates availability and discards an in-flight old server result", async t => {
  const f = setup(t); await f.refresh(); f.account({ origin: "https://next.example.com" });
  assert.equal((await f.status()).managedAvailable, null);
  let finish; f.api.network.fetch = () => new Promise(resolve => { finish = resolve; });
  const pending = f.refresh(); f.account({ origin: "https://third.example.com" }); finish(response(available));
  await assert.rejects(pending, /account server changed/);
  assert.equal((await f.status()).managedAvailable, null); assert.equal((await f.status()).managedError, null);
  assert.equal(f.privateCalls.length, 0);
});
test("account sign-out and expired sessions keep their sign-in recovery instead of an internet error", async t => {
  const f = setup(t, true);
  f.api.account.request = async () => { f.account({ signedIn: false }); throw Error("Sign in to your KAI account first"); };
  await assert.rejects(f.refresh(), /Sign in to your KAI account in Settings/);
  assert.equal((await f.status()).managedAvailable, true); assert.equal((await f.status()).signedIn, false);
  f.account({ signedIn: true }); f.api.account.request = async () => response({ ok: false, error: "Unauthorized" }, 401);
  await assert.rejects(f.refresh(), /sign-in has expired/);
  assert.equal((await f.status()).sessionExpired, true); assert.equal((await f.status()).signedIn, false);
  f.account({ binding: "new-session" }); assert.equal((await f.status()).sessionExpired, false);
  f.api.account.request = async () => response({ ok: false, error: "Composio rejected this key. Check your project API key." }, 401);
  await assert.rejects(f.refresh(), /server's Composio key was rejected/);
  assert.equal((await f.status()).signedIn, true); assert.equal((await f.status()).sessionExpired, false);
});
test("Local-Only and invalid account origins prevent public and authenticated requests", async t => {
  const f = setup(t, true); f.api.network.status = () => ({ privacyMode: "local-only" });
  await assert.rejects(f.refresh(), /Local-Only/); assert.equal(f.publicCalls.length, 0); assert.equal(f.privateCalls.length, 0);
  f.api.network.status = () => ({ privacyMode: "local-first" });
  for (const origin of ["http://accounts.example.com", "https://accounts.example.com/path", "https://user:password@accounts.example.com", "not-a-url", null]) {
    f.account({ origin }); await assert.rejects(f.refresh(), /account server|Managed connections/);
    assert.ok((await f.status()).managedError);
  }
  assert.equal(f.publicCalls.length, 0); assert.equal(f.privateCalls.length, 0);
});

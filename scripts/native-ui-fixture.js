"use strict";
// Isolated integration fixture: keep Core's SDK, privacy checks and UI real,
// but replace public transport. Never contacts a live account or OAuth provider.
function install({ coreSource, runtimeRoot, appData, reportFile }) {
  const path = require("node:path");
  require(path.join(coreSource, "scripts/foundation/apps-fixture")).install({ appRoot: runtimeRoot, appData, reportFile, syntheticKeychain: true });
  const origin = "https://connections-fixture.invalid";
  const state = global.__connectionsSmoke = { mode: "available", publicRequests: [], accountRequests: [], navigation: [] };
  require(path.join(runtimeRoot, "core/lib/public-http")).assertPublicTarget = async raw => {
    const url = new URL(raw);
    if (!(url.origin === origin && url.pathname === "/connections/status") && !(url.origin === "https://logos.composio.dev" && url.pathname.startsWith("/api/"))) throw Error("Connections fixture blocks other public requests");
    return [{ address: "93.184.216.34", family: 4 }];
  };
  require(path.join(runtimeRoot, "electron/foundation-network")).pinnedRequest = async (url, options) => {
    if (url.origin === "https://logos.composio.dev" && url.pathname.startsWith("/api/")) {
      // Keep the three logo workers realistically asynchronous so fixture-only
      // instant failures do not exhaust Core's real per-second IPC limit.
      await new Promise(resolve => setTimeout(resolve, 250)); options.signal.throwIfAborted();
      // Successful assets are cached by the real UI; repeated Refresh actions
      // should not create a fixture-only storm of failing logo retries.
      return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>', { headers: { "content-type": "image/svg+xml" } });
    }
    state.publicRequests.push({ url: url.href, method: options.method, authorization: new Headers(options.headers).get("authorization") });
    if (url.origin !== origin || url.pathname !== "/connections/status") throw Error("Unexpected public fixture request");
    if (state.mode === "failure") return new Response("Unavailable", { status: 503 });
    return new Response(JSON.stringify({ available: true, protocol: 1, generation: "fixture-generation" }), { headers: { "content-type": "application/json" } });
  };
  const blockedFetch = global.fetch;
  global.fetch = (raw, options) => {
    const url = new URL(typeof raw === "string" || raw instanceof URL ? raw : raw.url);
    if (url.origin === origin && url.pathname.startsWith("/connections/api/")) {
      state.accountRequests.push({ path: url.pathname, method: options?.method, authorization: new Headers(options?.headers).get("authorization") });
      if (url.pathname !== "/connections/api/accounts") throw Error("Unexpected authenticated fixture action");
      return Promise.resolve(new Response(JSON.stringify({ ok: true, result: { accounts: [] } }), { headers: { "content-type": "application/json" } }));
    }
    return blockedFetch(raw, options);
  };
  const module = require(path.join(runtimeRoot, "electron/foundation-api")), create = module.createFoundationApi;
  module.createFoundationApi = (context, record) => {
    global.__connectionsCore = context.core;
    const openCoreView = context.openCoreView;
    return create({ ...context, openCoreView(view, section) { state.navigation.push({ view, section }); return openCoreView(view, section); } }, record);
  };
}
module.exports = { install };

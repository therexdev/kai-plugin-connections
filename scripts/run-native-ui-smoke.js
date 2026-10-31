"use strict";
// Run against a sibling Core checkout, or its packaged app.asar via
// KAI_SMOKE_RUNTIME_ROOT. All external responses and account state are synthetic.
const fs = require("node:fs"), path = require("node:path"), os = require("node:os"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const pluginRoot = path.resolve(__dirname, ".."), coreSource = path.resolve(process.env.KAI_CORE_SOURCE_ROOT || path.join(pluginRoot, "../kai-core"));
const runtimeRoot = path.resolve(process.env.KAI_SMOKE_RUNTIME_ROOT || coreSource);
async function main() {
  const { _electron } = require(path.join(coreSource, "node_modules/playwright-core"));
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "kai-connections-ui-")), profile = path.join(temp, "profile");
  const output = path.resolve(process.env.KAI_CONNECTIONS_SMOKE_OUTPUT || path.join(os.tmpdir(), "kai-connections-ui-smoke")); fs.mkdirSync(output, { recursive: true });
  const report = { runtimeRoot, realCore: true, syntheticProfile: true, syntheticNetwork: true, syntheticAccount: true, liveOAuth: false, checks: [] };
  require(path.join(coreSource, "electron/foundation-profile")).prepareFoundationProfile(profile);
  fs.writeFileSync(path.join(profile, "settings.json"), JSON.stringify({ network: { privacyMode: "local-first" }, earn: { autoStart: false, schedulerUrl: "https://connections-fixture.invalid/scheduler" } }));
  const { signingPayload, BINARY, verifyPackage } = require(path.join(coreSource, "core/lib/plugins/package"));
  const { PluginManager } = require(path.join(coreSource, "core/lib/plugins/manager"));
  const manager = new PluginManager(profile), source = path.join(pluginRoot, "plugin"), manifest = JSON.parse(fs.readFileSync(path.join(source, "manifest.json"), "utf8")), files = {};
  function walk(directory, prefix = "") {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      assert.equal(item.isSymbolicLink(), false); const relative = prefix + item.name;
      if (item.isDirectory()) walk(path.join(directory, item.name), relative + "/");
      else if (relative !== "manifest.json") files[relative] = fs.readFileSync(path.join(directory, item.name)).toString(BINARY.test(relative) ? "base64" : "utf8");
    }
  }
  walk(source);
  if (process.env.KAI_CONNECTIONS_SMOKE_PACKAGE) {
    const file = path.resolve(process.env.KAI_CONNECTIONS_SMOKE_PACKAGE), publisher = JSON.parse(fs.readFileSync(path.join(pluginRoot, "publisher.json"), "utf8"));
    const verified = verifyPackage(fs.readFileSync(file, "utf8"));
    assert.deepEqual(verified.manifest, manifest, "Signed manifest differs from source");
    assert.deepEqual(verified.package.files, files, "Signed package differs from current plugin source");
    assert.equal(verified.fingerprint, publisher.fingerprint, "Unexpected signed publisher");
    assert.equal(verified.package.publicKey, publisher.publicKey, "Unexpected publisher key");
    manager.install(verified.package, { trustNative: true });
    Object.assign(report, { ephemeralSignature: false, package: file, fingerprint: verified.fingerprint, digest: verified.digest });
  } else {
    const keys = crypto.generateKeyPairSync("ed25519");
    manager.install({ manifest, files, publicKey: keys.publicKey.export({ format: "der", type: "spki" }).toString("base64"), signature: crypto.sign(null, Buffer.from(signingPayload(manifest, files)), keys.privateKey).toString("base64") }, { trustNative: true });
    report.ephemeralSignature = true;
  }
  report.pluginVersion = manifest.version;
  fs.writeFileSync(path.join(temp, "package.json"), JSON.stringify({ name: "kai-connections-ui-smoke", version: require(path.join(coreSource, "package.json")).version, main: "desktop.js" }));
  fs.writeFileSync(path.join(temp, "desktop.js"), `require(${JSON.stringify(path.join(__dirname, "native-ui-fixture.js"))}).install(${JSON.stringify({ coreSource, runtimeRoot, appData: path.join(temp, "app-data"), reportFile: path.join(output, "exit.json") })});require(${JSON.stringify(path.join(runtimeRoot, "electron/core-main.js"))});`);
  const args = []; if (process.platform === "linux" && process.getuid?.() === 0) args.push("--no-sandbox"); if (process.platform === "linux" && !process.env.DISPLAY) args.push("--ozone-platform=headless"); args.push(temp);
  const env = { ...process.env, KAI_CORE_DATA: profile, KAI_CORE_PORT: "0", KAI_CHANNEL: "core" }; delete env.ELECTRON_RUN_AS_NODE; delete env.KAI_SESSION_SECRET; delete env.KAI_CORE_TOKEN;
  const until = async (check, message) => { for (let i = 0; i < 300; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error(message); };
  let app, page;
  const evaluate = async (fn, input) => { for (let i = 0; ; i++) { try { return await app.evaluate(fn, input); } catch (error) { if (i >= 3 || !String(error.message).includes("Resulting promise was garbage collected")) throw error; } } };
  const pluginEval = expression => evaluate((_electron, expression) => global.__foundationHost.renderer("kai.connections").executeJavaScript(expression, true), expression);
  // Observe state without adding assertion polling to the renderer's real IPC
  // budget. Every user action below still crosses the actual UI/SDK boundary.
  const status = () => evaluate(() => global.__foundationServices.services.get("kai.connections").call("connections.ui.status", {}));
  const refresh = async () => {
    // Readiness is redrawn before the handler releases its busy guard. Use the
    // persistent search-bar button and wait for that same UI action to finish.
    const ready = '!!document.querySelector(".cn-searchbar [data-cn=refresh]") && !document.querySelector(".cn-searchbar [data-cn=refresh]").disabled';
    await until(() => pluginEval(ready), "Refresh button did not become available");
    await pluginEval('document.querySelector(".cn-searchbar [data-cn=refresh]").click();true');
    await until(() => pluginEval(ready), "Refresh action did not finish");
  };
  const capture = name => evaluate((_electron, file) => global.__foundationCapture(file, "kai.connections"), path.join(output, name + ".png"));
  try {
    app = await _electron.launch({ executablePath: require(path.join(coreSource, "node_modules/electron")), args, env, timeout: 60000 });
    page = await app.firstWindow(); await evaluate(() => global.__foundationWindow.setContentSize(1280, 900));
    await page.waitForFunction(() => document.getElementById("version")?.textContent.startsWith("v")); report.coreVersion = await page.locator("#version").innerText();
    await page.locator('[data-app="kai.connections"]').click();
    await until(() => evaluate(() => global.__foundationHost.windows.get("kai.connections")?.ready), "Connections did not open");
    await until(async () => (await status()).composio?.managedAvailable === true, "Signed-out public availability did not resolve");
    await until(() => pluginEval('!!document.querySelector("[data-cn=signin]")'), "Sign-in action did not appear");
    let network = await evaluate(() => global.__connectionsSmoke);
    assert(network.publicRequests.length > 0); assert(network.publicRequests.every(request => request.authorization === null)); assert.equal(network.accountRequests.length, 0);
    assert.equal((await status()).composio.signedIn, false); await capture("signed-out-available");
    report.checks.push("Signed-out availability uses the public Core network API without an account bearer");
    await pluginEval('document.querySelector("[data-cn=signin]").click();true');
    await page.waitForFunction(() => !document.querySelector('[data-panel="settings"]').hidden && document.getElementById("account-heading").textContent === "Koinos AI account");
    network = await evaluate(() => global.__connectionsSmoke); assert(network.navigation.some(item => item.view === "settings" && item.section === "website-account"));
    report.checks.push("Sign in opens Core Settings at the website account section");
    await page.locator('[data-app="kai.connections"]').click();
    await evaluate(() => { global.__connectionsSmoke.mode = "failure"; }); await refresh();
    await until(async () => !!(await status()).composio?.managedError, "Failed status did not retain an error");
    await until(() => pluginEval('!document.querySelector(".cn-readiness")?.textContent.includes("Checking") && !!document.querySelector(".cn-notice.cn-error")?.textContent.trim()'), "Failure remained in Checking state");
    await capture("availability-error"); report.checks.push("Availability failure leaves Checking and offers a retry");
    await evaluate(() => { global.__connectionsSmoke.mode = "available"; }); await refresh();
    await until(async () => { const state = (await status()).composio; return state.managedAvailable === true && !state.managedError; }, "Availability did not recover after retry");
    await until(() => pluginEval('!document.querySelector(".cn-notice")?.textContent.trim()'), "Successful retry retained the previous error notice");
    await evaluate(() => { global.__connectionsCore.account._memorySession = { token: "synthetic-connections-session", scope: "account" }; }); await refresh();
    await until(() => evaluate(() => global.__connectionsSmoke.accountRequests.length > 0), "Signed-in refresh did not use authenticated account API");
    network = await evaluate(() => global.__connectionsSmoke);
    assert(network.accountRequests.every(request => request.path === "/connections/api/accounts" && request.method === "POST" && request.authorization === "Bearer synthetic-connections-session"));
    assert(network.publicRequests.every(request => request.authorization === null)); report.checks.push("Signed-in account operations retain Core's authenticated account request path");
    await evaluate(() => { global.__connectionsCore.account._memorySession = null; });
    await page.evaluate(() => window.kaiCore.call("privacy", { mode: "local-only" }));
    await until(() => evaluate(() => !global.__foundationHost.windows.get("kai.connections").calls.some(at => Date.now() - at < 1000)), "Cancelled logo requests did not settle");
    const count = await evaluate(() => global.__connectionsSmoke.publicRequests.length); await refresh();
    await until(async () => (await status()).composio?.blocked === true, "Local-Only did not block Connections");
    assert.equal(await evaluate(() => global.__connectionsSmoke.publicRequests.length), count); report.checks.push("Local-Only prevents public availability traffic");
    const errors = await evaluate(() => global.__foundationSmoke.errors); assert.deepEqual(errors, []);
    await app.close(); app = null;
    const verified = manager.materialize(manifest.id); verified.dispose(); report.checks.push("Native service and UI left the signed code snapshot unchanged");
    report.status = "passed";
  } catch (error) {
    report.status = "failed"; report.error = error.stack;
    if (app) {
      report.diagnostics = await evaluate(async () => ({
        network: global.__connectionsSmoke,
        status: (await global.__foundationServices.services.get("kai.connections")?.call("connections.ui.status", {}))?.composio,
        ui: await global.__foundationHost.renderer("kai.connections")?.executeJavaScript('({notice:document.querySelector(".cn-notice")?.textContent,readiness:document.querySelector(".cn-readiness")?.textContent})')
      })).catch(diagnosticError => ({ error: diagnosticError.message }));
    }
    throw error;
  }
  finally { if (app) await app.close().catch(() => {}); fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2)); fs.rmSync(temp, { recursive: true, force: true }); console.log("Report", path.join(output, "report.json")); }
}
main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });

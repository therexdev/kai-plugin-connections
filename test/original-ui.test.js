"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = path.join(__dirname, "../plugin"), original = require("../plugin/original-ui.json");
test("upstream renderer assets retain their hashes outside documented Foundation dialog adaptations", () => {
  for (const [file, hash] of Object.entries(original.files)) {
    let content = fs.readFileSync(path.join(root, file));
    if (file === "companion-hub.js") content = content.toString().replace("Unlock secure OS storage and reopen this app. Saved plugin data has been preserved.", "Unlock your original OS keychain and restart KAI. Your saved data will stay intact.").replace('await window.kai.dialogs.confirm("Remove this " + deleting[name][1] + "?")', 'confirm("Remove this " + deleting[name][1] + "?")');
    if (file === "brain.js") content = content.toString().replace('await window.kai.dialogs.confirm("Clear retained memory changes and activity? Your current memories will stay.") || !alive()', 'confirm("Clear retained memory changes and activity? Your current memories will stay.")');
    if (file === "connections.js") content = content.toString().replace('<button type="button" class="cn-button cn-dialog-close" data-cn="close" aria-label="Close dialog" title="Close">×</button>', '${btn("Close", "close")}');
    assert.equal(crypto.createHash("sha256").update(content).digest("hex"), hash, file);
  }
});
test("every loaded script and stylesheet is packaged and no legacy HTTP bridge is installed", () => {
 const html = fs.readFileSync(path.join(root,"index.html"),"utf8");
 for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) assert.ok(fs.existsSync(path.join(root,match[1])),match[1]);
 assert.ok(html.includes('plugin-bridge.js'));
 const bridge = fs.readFileSync(path.join(root,"plugin-bridge.js"),"utf8");
 assert.match(bridge,/feature \+ "\.ui\." \+ action/);
 assert.doesNotMatch(bridge,/\bfetch\s*\(|XMLHttpRequest|http:\/\/127\.0\.0\.1/);
 assert.match(bridge,/desktop.openView/); assert.match(bridge,/desktop.openExternal/);
});

"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = path.join(__dirname, "../plugin"), original = require("../plugin/original-ui.json");
test("the original feature renderer, styles, localization and catalog are preserved exactly", () => {
  for (const [file, hash] of Object.entries(original.files)) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex"), hash, file);
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

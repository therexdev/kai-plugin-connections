"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname,"../plugin/plugin-bridge.js"),"utf8");
function fixture() {
 const calls = [], events = {}, windowEvents = {}, passwords = [{value:"synthetic-secret"},{value:"synthetic-key"}];
 const context = { window: { kai: { call: async (method,input) => { calls.push({method,input}); return {id:"saved"}; } }, addEventListener:(name,handler) => {windowEvents[name] = handler;} },
 document: { hidden:false, addEventListener:(name,handler)=>{events[name]=handler;},querySelectorAll:()=>passwords,querySelector:()=>null } };
 vm.runInNewContext(source,context);
 return {context,calls,events,windowEvents,passwords,bridge:context.window.kaiCompanionBridge};
}
test("original manage envelopes use the feature's private action routes without starting any operation on load",async()=>{
 const f=fixture(); assert.equal(f.calls.length,0);
 const input={title:"Example",text:"Exact contents"}; const result=await f.bridge.manage("note",input);
 assert.equal(f.calls[0].method,"connections.ui.note"); assert.equal(f.calls[0].input,input); assert.equal(result.ok,true); assert.equal(result.result.id,"saved");
});
test("host failures retain the original checked companion error protocol",async()=>{
 const f=fixture(); f.context.window.kai.call=async()=>{throw Error("Saved data is locked");};
 const result=await f.bridge.manage("status"); assert.equal(result.ok,false); assert.equal(result.error,"Saved data is locked");
});
test("secret fields are cleared when hidden or closed",()=>{
 const f=fixture();f.context.document.hidden=true;f.events.visibilitychange();assert.deepEqual(f.passwords.map(p=>p.value),["",""]);
 f.passwords[0].value="new synthetic key";f.windowEvents.pagehide();assert.equal(f.passwords[0].value,"");
});
test("cross-feature navigation and HTTPS help links pass through reviewed desktop brokers",async()=>{
 const f=fixture(); await f.context.window.activateView("tools"); assert.equal(f.calls[0].method,"desktop.openView"); assert.equal(f.calls[0].input.view,"tools");
 let stopped=false;f.events.click({target:{closest:selector=>selector==="a[href]"?({getAttribute:()=>"https://dashboard.composio.dev/",href:"https://dashboard.composio.dev/"}):null},preventDefault(){stopped=true;}});
 assert.equal(stopped,true);assert.equal(f.calls[1].method,"desktop.openExternal");
 await f.context.window.activateView("api");assert.equal(f.calls[2].input.view,"privacy");
});

test("original provider settings and account sign-in shortcuts open the matching installed surfaces",async()=>{
 const f=fixture();let stopped=false;f.events.click({target:{closest:selector=>selector.includes("providerSettings")?{}:null},preventDefault(){},stopImmediatePropagation(){stopped=true;}});
 assert.equal(stopped,true);assert.equal(f.calls[0].input.view,"assistant");assert.equal(f.calls[0].input.section,"providers");
 await f.context.window.selectAccountScope(true);assert.equal(f.calls[1].input.view,"settings");assert.equal(f.calls[1].input.section,"website-account");
 await f.context.window.selectAccountScope(false);assert.equal(f.calls[2].input.section,"credit-account");
});

"use strict";
const {CompanionError}=require("./companion-store");
async function manage(service,ctx,action,input={}){if(action==="status")return service.status();service.store.requireStorage();switch(action){
      case "composioSettings": return service.composio.save(input, ctx.signal);
      case "composioRefresh": return service.composio.refresh(ctx.signal);
      case "composioCatalog": return service.composio.catalog(input, ctx.signal);
      case "composioTools": return service.composio.tools(input, ctx.signal);
      case "composioConnect": return service.composio.connect(input.slug, ctx.signal);
      case "composioReopen": return service.composio.reopen(ctx.signal);
      case "composioPermissions": return service.composio.permissions(input, ctx.signal);
      case "composioDisconnect": {
        const connection = service.connections.list().find(c => c.id === input.id);
        if (!connection || !await ctx.confirm("Disconnect " + connection.name, { account: connection.name, app: connection.toolkit, effect: "Remove this Composio account connection and pause its Brain sources." })) throw new CompanionError("Connection kept.");
        return service.composio.disconnect(input.id, ctx.signal);
      }
      case "composioLogo": return service.composio.logo(input.slug, ctx.signal);
      case "approvalGrantRemove": return service.store.change(d => {
        const key = typeof input.key === "string" ? input.key : "";
        d.settings.approvalGrants = (d.settings.approvalGrants || []).filter(g => g.key !== key);
      });

      case "connection": return service.connections.save(input);
      case "removeConnection": return service.connections.remove(input.id);
      case "request": {
        const request = service.connections.prepare(input.connectionId, input.operationId, input.variables || {}, input.body);
        const c = service.store.data.connections.find(c => c.id === input.connectionId);
        if (request.method !== "GET" && !await ctx.confirm(request.name, request, { key: `connected:${c.id}:${request.operationId}:${c.revision}`, label: `${c.name} · ${request.name}` })) throw new CompanionError("User declined. The request did not run.");
        return service.connections.execute(request, ctx.signal);
      }

 case "source":return service.api.services.call("kai.brain","source",input,{signal:ctx.signal});
 case "sync":return service.api.services.call("kai.brain","sync",input,{signal:ctx.signal});
 case "conversationReview":{const r=service.store.data.receipts.find(r=>r.id===input.id);if(!r||r.status!=="uncertain")throw Error("Choose an uncertain connection action.");if(!await ctx.confirm("Acknowledge inspected action",r))throw Error("Receipt kept uncertain.");return service.store.change(d=>{const x=d.receipts.find(x=>x.id===r.id);x.status="reviewed";x.message="User reviewed the external outcome.";});}
 default:throw new CompanionError("Unknown Connections action.");}}

module.exports={manage};

# KAI Connections plugin

The original KAI Connections workspace, installed separately and opened in its own window. The original renderer, full app catalog, categories, provider profiles, bundled icons, styles and offline language catalogs are retained from `therexdev/kaiapp` commit `34d17faa0526213b8fc0ac7a65aa7f2c186c6547`.

All five original sections remain: Explore apps, Connected, Connection settings, Custom APIs, and Models & other tools. Account sign-in, reopening pending sign-in, action discovery and schemas, selected read/write permissions, personal or KAI-managed Composio, custom API templates, action execution, durable action receipts and always-allow grant management use the original services. Collect into Brain creates and syncs an approved connected-app source; cross-feature links open the corresponding installed workspace.

Core keeps saved credentials in the existing encrypted shared store. Tokens are never returned to the plugin. Each UI action is a separately scoped private broker method; native reviews preserve one-time and explicitly saved action grants. The separate `connections.brain` permission covers collecting connected-app responses into Brain; it does not grant access to existing Brain notes or private folder sources. Rented agents do not receive private account credentials.

`plugin/original-ui.json` records hashes of the original assets. `npm test` checks those assets, the packaged entry and the scoped bridge. Core's `scripts/core/brain-connections-parity-smoke.js` exercises the real Electron renderer and original companion action handlers on a synthetic profile; it does not claim to test external OAuth providers or a user's OS keychain.

# KAI Connections

Connections is a self-contained KAI Foundation plugin. It owns connected accounts, API credentials, Composio OAuth/catalog/actions, connection grants, event subscriptions and action receipts. Its backend is bundled in `plugin/service`, its interface and assets in `plugin`, and its encrypted state lives in its own Core-assigned data directory. No feature engine or shared CompanionHub is imported from Core.

## Installation and trust

Version 0.3.0 requires manifest schema 2 / API 3 and the public native SDK v1. Install its signed `.kaiplugin` through Foundation → Plugins. The native backend runs with **full computer and application access**. It is not an OS sandbox. The interface remains a sandboxed renderer; that protects the renderer boundary, not the trusted native backend.

This release uses fresh plugin data. It does not open or migrate the old Koinos AI profile. Disabling/updating the plugin or quitting Core stops its owned work. Navigation and the Core tray keep enabled apps alive. No package installation scripts or npm commands run on the user's machine.

## Public service

The manifest declares `kai.connections` as its provided service. Its methods are `list`, `get`, `prepare`, `execute`, `request`, `tools`, `tool`, `events.context`, `events.types`, `events.setup`, `events.poll`. Other plugins declare this service in `consumes` and use `api.services.call(name, method, input, {signal})`. Methods accept JSON values. Core rejects remote/delegated service contexts. The provider retains approval authority; a caller cannot grant itself write approval.

Connection credentials are encrypted in Connections' state and never included in service results. `prepare` accepts `{connectionId, operationId, variables, body, purpose}` and returns a review descriptor plus a short-lived `preparedId`; `execute({preparedId})` revalidates the exact saved request. `request` combines these steps. Agent calls require the account's agent grant; source reads require its background-read grant; writes require provider-owned approval. Event RPC returns metadata/payloads, never provider keys. Managed Composio uses Core's authenticated account request broker; personal Composio uses plugin-owned credentials.

The public `/connections/status` availability check uses Core's bounded network broker at the current KAI account origin and sends no credentials. This lets signed-out users see whether managed connections are available and open Settings → Koinos AI account to sign in. All `/connections/api/*` account actions still use Core's authenticated account broker. Failed availability checks show a retryable service error; they do not remain in a loading state or change saved accounts. Changing account servers invalidates the cached availability result.

## Checks

Run `npm test`. Tests cover the preserved UI, actual plugin-owned engine behavior, independent encrypted state, provider-owned review and missing-service failures. Workflows additionally tests bounded JavaScript, graph execution and a cross-plugin integration when the sibling Brain/Connections repos are present. These are synthetic local checks, not live provider/OAuth or native operating-system verification.

The original renderer/layout assets remain recorded in the existing provenance files. This does not require or restore the old runtime/profile structure.

## Foundation package publication

Requires KAI Core **0.7.0 or later**, manifest schema 2/API 3 and native API v1. Source lives in `plugin/`, including its service and all runtime dependencies. Runtime installation never runs npm or dependency hooks.

Before signing, install any author dependencies with `npm ci --ignore-scripts` when this repository has a lockfile, run `npm run build --if-present`, then `node scripts/verify-package.js --source` and `npm test`. The source-only check uses a temporary in-memory test signature; it does not claim a publisher release was signed.

Pack the complete plugin using Core's `scripts/core/pack-plugin.js`, keeping the publisher private key outside every repository. Place the new immutable signed asset at `dist/<repository-name>-<manifest-version>.kaiplugin`, then run `node scripts/verify-package.js`. The release verifier checks the actual publisher signature and exact source/assets/dependency contents against the same package rules as Core. Its standalone format snapshot and SHA-256 provenance are under `scripts/package-format-v3*`; it never imports or executes submitted plugin code.

CI tests source on `foundation-v1`, pull requests and `main` on Windows, macOS and Linux. It checks any signed asset present for the current version. Publication runs only from `main`, only when that exact signed asset exists, and only after every check passes. Existing release assets must match byte-for-byte and are never overwritten. Branch builds cannot publish releases. Native device/integration checks remain necessary before a release; unit tests do not replace them.

## Interface language

This plugin follows the language saved in KAI Core Settings and applies changes to open views. English, Spanish, Brazilian Portuguese, French and German are supported through bundled offline catalogs. User content and identifiers stay literal. These source changes require Core 0.7.17+ for the live locale API; release the Core update before publishing a new signed plugin package and catalog entry. See the [public localization API](https://github.com/therexdev/kai-core/blob/main/docs/foundation/PLUGIN_AUTHOR_GUIDE.md#shared-language-and-localization-core-0717).

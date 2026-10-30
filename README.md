# KAI Connections

Connect accounts and APIs from **KAI Core 0.2.0 or later**. This is an installable first-party KAI plugin, not a browser extension or a ChatGPT plugin.

## What works

- Reuse existing encrypted KAI connections in place, alongside existing Brain and workflow data.
- Add or edit API connections using GitHub, Notion, Slack, Home Assistant, or custom templates. Saved operations support path variables and JSON bodies.
- Search the Composio app catalog, authorize accounts in your browser, refresh connected accounts, and select up to 30 actions per account.
- Choose personal agent access, background read access, and write access per account.
- Run saved actions with a separate native review of the destination and arguments, then inspect their response.
- Use a personal Composio project key or a configured KAI-managed account service.

## Install

Download the signed `kai.connections-0.1.0.kaiplugin` release asset, then select **Plugins → Install package** in KAI Core. Review the publisher and the three Connections permissions. Core pins the first-party publisher; an unsigned checkout is not an installable release.

Open **Provider settings** for Composio, or **Add an API** to use a token directly. After browser authorization, select **Refresh accounts**. Connecting accounts does not publish credentials or grant access to rented agents.

## Privacy and limits

Saved keys and tokens stay in Core's existing OS-encrypted account store. A token entered in the plugin form is sent once to Core and cleared; saved secrets are never loaded back into the renderer. Native review is required before account changes and manual action execution. This plugin cannot read Brain, wallet keys, or another plugin's storage. API results are shown only after an explicitly reviewed action.

Local-Only blocks network requests, including localhost account API requests. Managed connections require a KAI account server with Composio configured; personal mode requires a Composio project. OS secure storage must be available and unlocked. Missing, unreadable, or incompatible saved data is preserved and reported rather than reset. Changing API destinations requires a new credential.

This release does not run background sync, execute workflows, or rent agents itself. The access flags configure existing records; corresponding feature plugins decide when to use them. It supports saved REST operations and Composio actions, not arbitrary browser automation or arbitrary network requests. Account sign-in is limited to Composio's approved HTTPS hosts and requires native review.

## Development

The `plugin/` directory contains a dependency-free frontend. `window.kai.call` is its only host bridge. All privileged logic lives in the reviewed Connections broker bundled with Core. The package requests `connections.read`, `connections.manage`, and `connections.execute`.

Run `npm test` using Node 20 or later. Tests exercise startup without network mutations, JSON validation, form dispatch, credential clearing, and untrusted text escaping. Core separately tests encrypted-store preservation, host-only credentials, native review, response/error redaction, and privacy enforcement. Live Composio authorization requires a real account and is not simulated by a claim of production validation.

Publisher keys belong outside this repository. Core's release pipeline builds and signs the package; do not place signing keys or personal credentials in source.

## Workspace appearance

The plugin uses the original Connections workspace: a section rail, searchable app catalog with category and sign-in filters, connected-account cards, and connection-method settings. The bundled app catalog and platform marks are local assets, so browsing them does not make a network request. Connecting still goes through Core’s existing native review and browser sign-in. Catalog metadata can be older than the live provider; actual sign-in availability is checked by Core.

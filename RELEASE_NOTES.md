# Connections 0.3.2

Requires **KAI Core 0.7.3 or later**. Update Core before installing this plugin update.

KAI-managed connections now check the server's public availability before account sign-in. Opening Explore while signed out shows the KAI sign-in action instead of an incorrect internet error, and that action opens Settings → Koinos AI account directly. Connecting apps and account actions continue to use Core's authenticated broker.

If the server cannot be checked, Explore and Connection settings show a retryable service error instead of remaining on “Checking”. Retry clears the old error, and changing account servers discards stale availability. Expired KAI sign-ins and a rejected server Composio key remain distinct.

Saved plugin data and feature behavior are preserved.

Validation covers signed-out and authenticated requests, status failures/retry, response bounds, account-server changes, Local-Only, unchanged saved accounts, and renderer sign-in/error states without live OAuth, payment or node operations. Native plugin services still require full computer/application trust; renderer UI remains sandboxed.

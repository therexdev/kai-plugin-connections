"use strict";
(() => {
  const feature = "connections";
  const call = (method, input) => window.kai.call(method, input);
  // Keep the original companion protocol while crossing the plugin-owned native
  // service. The service owns its operations and native approvals.
  window.kaiCompanionBridge = Object.freeze({
    manage: async (action, input = {}) => {
      try { return { ok: true, result: await call(feature + ".ui." + action, input) }; }
      catch (error) { return { ok: false, error: String(error?.message || "The operation could not finish.") }; }
    },
  });
  window.activateView = view => call("desktop.openView", { view: view === "api" ? "privacy" : view });
  window.selectAccountScope = website => call("desktop.openView", { view: "settings", section: website ? "website-account" : "credit-account" });
  document.addEventListener("click", event => {
    if (event.target.closest?.('[data-hub-action="providerSettings"]')) {
      event.preventDefault(); event.stopImmediatePropagation();
      void call("desktop.openView", { view: "assistant", section: "providers" }); return;
    }
    const link = event.target.closest?.("a[href]");
    if (!link || !/^https:\/\//i.test(link.getAttribute("href") || "")) return;
    event.preventDefault();
    void call("desktop.openExternal", { url: link.href }).catch(error => {
      const notice = document.querySelector(".cn-notice,.bn-notice,.hub-notice");
      if (notice) { notice.textContent = error.message; notice.classList.add("error"); }
    });
  });
  // Credentials are submitted once to the plugin service, never retained on a hidden window.
  const clearPasswords = () => { for (const input of document.querySelectorAll('input[type="password"]')) input.value = ""; };
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearPasswords(); });
  window.addEventListener("pagehide", clearPasswords);
})();

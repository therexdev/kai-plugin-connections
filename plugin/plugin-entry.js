"use strict";
(() => {
  // Preserve dismissible notifications requested for the Core/plugin shell.
  const dismissible = () => {
    for (const notice of document.querySelectorAll(".hub-notice,.bn-notice,.cn-notice")) {
      if (!notice.textContent.trim() || notice.querySelector(".plugin-notice-close")) continue;
      const button = document.createElement("button"); button.type = "button";
      button.className = "plugin-notice-close"; button.textContent = "×";
      button.setAttribute("aria-label", "Dismiss notification");
      button.addEventListener("click", () => notice.replaceChildren()); notice.append(button);
    }
  };
  new MutationObserver(dismissible).observe(document.body, { childList: true, subtree: true, characterData: true });
  void window.KaiCompanionHub.render("connections");
})();

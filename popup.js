const DEFAULTS = {
  mode: "system",
  customProxy: { scheme: "http", host: "127.0.0.1", port: 7890, bypassList: ["localhost", "127.0.0.1", "<local>"] }
};

const form = document.querySelector("#customForm");
const editProxy = document.querySelector("#editProxy");
const message = document.querySelector("#message");
const fields = {
  scheme: document.querySelector("#scheme"), host: document.querySelector("#host"),
  port: document.querySelector("#port"), bypassList: document.querySelector("#bypassList")
};
let state = structuredClone(DEFAULTS);
let editing = false;

function messageFor(key) {
  return chrome.i18n.getMessage(key) || key;
}

function localize() {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = messageFor(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const value = messageFor(element.dataset.i18nTitle);
    element.title = value;
    element.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", messageFor(element.dataset.i18nAria));
  });
}

function render() {
  document.querySelectorAll(".mode").forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
  form.classList.toggle("visible", editing);
  editProxy.setAttribute("aria-expanded", String(editing));
}

function flash(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => { message.textContent = ""; }, 2200);
}

function readCustomProxy() {
  return {
    scheme: fields.scheme.value,
    host: fields.host.value.trim(),
    port: Number(fields.port.value),
    bypassList: fields.bypassList.value.split(",").map((item) => item.trim()).filter(Boolean)
  };
}

function isValidIPv4(value) {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

fields.host.addEventListener("input", () => {
  fields.host.value = fields.host.value
    .replace(/[^0-9.]/g, "")
    .split(".")
    .slice(0, 4)
    .map((part) => part.slice(0, 3))
    .join(".");
});

fields.port.addEventListener("input", () => {
  fields.port.value = fields.port.value.replace(/\D/g, "").slice(0, 5);
});

async function apply(mode, customProxy = state.customProxy) {
  const result = await chrome.runtime.sendMessage({ type: "applyProxy", mode, customProxy });
  if (!result?.ok) throw new Error(result?.error || "设置失败");
  state = { mode, customProxy };
  render();
}

async function selectMode(mode) {
  try { await apply(mode); } catch (error) { flash(error.message, true); }
}

document.querySelectorAll(".mode").forEach((control) => {
  control.addEventListener("click", () => selectMode(control.dataset.mode));
  if (control.tagName !== "BUTTON") control.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectMode(control.dataset.mode); }
  });
});

editProxy.addEventListener("click", (event) => {
  event.stopPropagation();
  editing = !editing;
  render();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const customProxy = readCustomProxy();
  if (!isValidIPv4(customProxy.host)) return flash(messageFor("invalidIp"), true);
  if (!/^\d+$/.test(fields.port.value) || customProxy.port < 1 || customProxy.port > 65535) return flash(messageFor("invalidPort"), true);
  try {
    await apply("custom", customProxy);
    editing = false;
    render();
    flash(messageFor("saved"));
  } catch (error) { flash(error.message, true); }
});

(async () => {
  localize();
  const saved = await chrome.storage.local.get(DEFAULTS);
  state = { mode: saved.mode, customProxy: saved.customProxy };
  fields.scheme.value = state.customProxy.scheme;
  fields.host.value = state.customProxy.host;
  fields.port.value = state.customProxy.port;
  fields.bypassList.value = (state.customProxy.bypassList || []).join(", ");
  render();
})();

const DEFAULTS = {
  mode: "system",
  customProxy: {
    scheme: "http",
    host: "127.0.0.1",
    port: 7890,
    bypassList: ["localhost", "127.0.0.1", "<local>"]
  }
};

const ICONS = {
  direct: "direct",
  system: "system",
  custom: "custom"
};

function iconPaths(mode) {
  const name = ICONS[mode] || ICONS.system;
  return {
    16: `icons/${name}-16.png`,
    32: `icons/${name}-32.png`,
    48: `icons/${name}-48.png`,
    128: `icons/${name}-128.png`
  };
}

function setIcon(mode) {
  return chrome.action.setIcon({ path: iconPaths(mode) });
}

function proxyConfig(mode, customProxy) {
  if (mode === "direct") return { mode: "direct" };
  if (mode === "system") return { mode: "system" };

  return {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: customProxy.scheme,
        host: customProxy.host,
        port: Number(customProxy.port)
      },
      bypassList: customProxy.bypassList || []
    }
  };
}

async function applyMode(mode, customProxy) {
  await chrome.proxy.settings.set({
    value: proxyConfig(mode, customProxy),
    scope: "regular"
  });
  await chrome.storage.local.set({ mode, customProxy });
  await setIcon(mode);
}

async function initialize() {
  const saved = await chrome.storage.local.get(DEFAULTS);
  await applyMode(saved.mode, saved.customProxy);
}

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "applyProxy") return false;

  applyMode(message.mode, message.customProxy)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

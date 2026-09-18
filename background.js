const DEFAULTS = {
  mode: "system",
  proxySettings: {
    scheme: "http",
    host: "127.0.0.1",
    port: 7890,
    bypassList: ["localhost", "127.0.0.1", "<local>"]
  }
};

const VALID_MODES = new Set(["direct", "system", "global"]);

function validMode(mode) {
  return VALID_MODES.has(mode) ? mode : DEFAULTS.mode;
}

function iconPaths(mode) {
  const name = validMode(mode);
  return {
    16: `icons/${name}-16.png`,
    32: `icons/${name}-32.png`,
    48: `icons/${name}-48.png`,
    128: `icons/${name}-128.png`
  };
}

function proxyConfig(mode, proxySettings) {
  if (mode === "direct") return { mode: "direct" };
  if (mode === "system") return { mode: "system" };

  return {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: proxySettings.scheme,
        host: proxySettings.host,
        port: Number(proxySettings.port)
      },
      bypassList: proxySettings.bypassList || []
    }
  };
}

async function applyMode(mode, proxySettings) {
  mode = validMode(mode);
  await chrome.proxy.settings.set({
    value: proxyConfig(mode, proxySettings),
    scope: "regular"
  });
  await chrome.storage.local.set({ mode, proxySettings });
  await chrome.action.setIcon({ path: iconPaths(mode) });
}

async function initialize() {
  const saved = await chrome.storage.local.get(DEFAULTS);
  const mode = saved.mode;
  const proxySettings = saved.proxySettings;
  await applyMode(mode, proxySettings);
}

chrome.runtime.onInstalled.addListener(initialize);
chrome.runtime.onStartup.addListener(initialize);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "applyProxy") return false;

  applyMode(message.mode, message.proxySettings)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

(function attachSteamMultiRegionHelperCore(root) {
  "use strict";

  const DEFAULT_ACCOUNTS = [
    { key: "cn", label: "China", cc: "CN", steamId: "" },
    { key: "ru", label: "Russia", cc: "RU", steamId: "" },
    { key: "tr", label: "Turkey/MENA", cc: "TR", steamId: "" },
    { key: "ua", label: "Ukraine", cc: "UA", steamId: "" },
  ];

  const COUNTRY_OPTIONS = [
    { cc: "CN", label: "China" },
    { cc: "RU", label: "Russia" },
    { cc: "TR", label: "Turkey/MENA" },
    { cc: "UA", label: "Ukraine" },
    { cc: "US", label: "United States" },
    { cc: "JP", label: "Japan" },
    { cc: "KR", label: "South Korea" },
    { cc: "HK", label: "Hong Kong" },
    { cc: "TW", label: "Taiwan" },
    { cc: "SG", label: "Singapore" },
    { cc: "AR", label: "Argentina" },
    { cc: "BR", label: "Brazil" },
    { cc: "CL", label: "Chile" },
    { cc: "CO", label: "Colombia" },
    { cc: "MX", label: "Mexico" },
    { cc: "CA", label: "Canada" },
    { cc: "GB", label: "United Kingdom" },
    { cc: "DE", label: "Germany" },
    { cc: "FR", label: "France" },
    { cc: "PL", label: "Poland" },
    { cc: "IN", label: "India" },
    { cc: "ID", label: "Indonesia" },
    { cc: "TH", label: "Thailand" },
    { cc: "VN", label: "Vietnam" },
    { cc: "PH", label: "Philippines" },
    { cc: "MY", label: "Malaysia" },
    { cc: "AU", label: "Australia" },
    { cc: "NZ", label: "New Zealand" },
    { cc: "KZ", label: "Kazakhstan" },
  ];

  const DISPLAY_CURRENCY_OPTIONS = [
    { code: "CNY", label: "Chinese Yuan" },
    { code: "USD", label: "US Dollar" },
    { code: "EUR", label: "Euro" },
    { code: "JPY", label: "Japanese Yen" },
    { code: "HKD", label: "Hong Kong Dollar" },
    { code: "TWD", label: "New Taiwan Dollar" },
    { code: "RUB", label: "Russian Ruble" },
    { code: "TRY", label: "Turkish Lira" },
    { code: "UAH", label: "Ukrainian Hryvnia" },
    { code: "GBP", label: "British Pound" },
  ];

  function findCountryOption(value) {
    const cc = normalizeCountryCode(value);
    return COUNTRY_OPTIONS.find((country) => country.cc === cc) || null;
  }

  function findDisplayCurrency(value) {
    const code = String(value || "").trim().toUpperCase();
    return DISPLAY_CURRENCY_OPTIONS.find((currency) => currency.code === code) || null;
  }

  function normalizeDisplayCurrency(value) {
    return findDisplayCurrency(value)?.code || "CNY";
  }

  function extractAppId(value) {
    try {
      const url = new URL(String(value || ""), "https://store.steampowered.com");
      const match = url.pathname.match(/^\/app\/(\d+)(?:\/|$)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  function normalizeCountryCode(value) {
    const cc = String(value || "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(cc) ? cc : "";
  }

  function normalizeAccountKey(value, fallback) {
    const key = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    return key || fallback;
  }

  function normalizeAccounts(accounts) {
    if (!Array.isArray(accounts)) {
      return DEFAULT_ACCOUNTS.map((account) => ({ ...account }));
    }

    const usedKeys = new Set();
    return accounts
      .map((account, index) => {
        const fallback = `account_${index + 1}`;
        let key = normalizeAccountKey(account && account.key, fallback);
        while (usedKeys.has(key)) {
          key = `${key}_${index + 1}`;
        }
        usedKeys.add(key);

        return {
          key,
          label: String((account && account.label) || key).trim() || key,
          cc: normalizeCountryCode(account && account.cc),
          steamId: String((account && account.steamId) || "").trim(),
        };
      })
      .filter((account) => account.label && account.cc);
  }

  function parsePriceOverview(priceOverview) {
    if (!priceOverview || typeof priceOverview !== "object") {
      return { available: false, reason: "no_price" };
    }

    return {
      available: true,
      currency: String(priceOverview.currency || ""),
      initialMinor: Number(priceOverview.initial || 0),
      finalMinor: Number(priceOverview.final || 0),
      discountPercent: Number(priceOverview.discount_percent || 0),
      initialFormatted: String(priceOverview.initial_formatted || ""),
      finalFormatted: String(priceOverview.final_formatted || ""),
    };
  }

  function normalizeStorePrice(appId, account, response) {
    const app = response && response[String(appId)];
    if (!app || app.success !== true) {
      return {
        accountKey: account.key,
        cc: account.cc,
        label: account.label,
        price: { available: false, reason: "store_unavailable" },
      };
    }

    return {
      accountKey: account.key,
      cc: account.cc,
      label: account.label,
      price: parsePriceOverview(app.data && app.data.price_overview),
    };
  }

  function minorToMajor(minorAmount) {
    return Number(minorAmount || 0) / 100;
  }

  function buildCnyRates(exchangeResponse) {
    const sourceRates = exchangeResponse && exchangeResponse.rates ? exchangeResponse.rates : {};
    const cnyRates = { CNY: 1 };

    for (const [currency, unitsPerCnyRaw] of Object.entries(sourceRates)) {
      const unitsPerCny = Number(unitsPerCnyRaw);
      if (currency && Number.isFinite(unitsPerCny) && unitsPerCny > 0) {
        cnyRates[String(currency).toUpperCase()] = 1 / unitsPerCny;
      }
    }

    return cnyRates;
  }

  function convertCurrencyAmount(amount, sourceCurrency, targetCurrency, cnyRatesByCurrency) {
    const sourceRate = cnyRatesByCurrency[String(sourceCurrency || "").toUpperCase()];
    const targetRate = cnyRatesByCurrency[String(targetCurrency || "").toUpperCase()];
    if (!Number.isFinite(amount) || !Number.isFinite(sourceRate) || !Number.isFinite(targetRate) || targetRate <= 0) {
      return Number.POSITIVE_INFINITY;
    }
    const cnyAmount = amount * sourceRate;
    return cnyAmount / targetRate;
  }

  function rankRegionalPrices(accountPrices, cnyRatesByCurrency, displayCurrency = "CNY") {
    const normalizedDisplayCurrency = normalizeDisplayCurrency(displayCurrency);

    return accountPrices
      .map((entry) => {
        if (!entry.price.available) {
          return {
            accountKey: entry.accountKey,
            label: entry.label,
            available: false,
            price: entry.price,
            displayCurrency: normalizedDisplayCurrency,
            displayAmount: Number.POSITIVE_INFINITY,
          };
        }

        const displayAmount = convertCurrencyAmount(
          minorToMajor(entry.price.finalMinor),
          entry.price.currency,
          normalizedDisplayCurrency,
          cnyRatesByCurrency
        );

        return {
          accountKey: entry.accountKey,
          label: entry.label,
          available: Number.isFinite(displayAmount),
          price: entry.price,
          displayCurrency: normalizedDisplayCurrency,
          displayAmount,
        };
      })
      .sort((a, b) => a.displayAmount - b.displayAmount);
  }

  function parseOwnedAppIds(webApiBody) {
    const parsed = typeof webApiBody === "string" ? JSON.parse(webApiBody) : webApiBody;
    const games = parsed && parsed.response && Array.isArray(parsed.response.games) ? parsed.response.games : [];
    return new Set(games.map((game) => String(game.appid)));
  }

  function findOwners(appId, ownedAppsByAccount, accounts) {
    return accounts
      .filter((account) => ownedAppsByAccount[account.key]?.has(String(appId)))
      .map((account) => account.key);
  }

  function formatDisplayAmount(value, displayCurrency = "CNY") {
    const currency = normalizeDisplayCurrency(displayCurrency);
    return Number.isFinite(value) ? `approx ${currency} ${value.toFixed(2)}` : "";
  }

  function buildRecommendation(owners, rankedPrices, accounts, displayCurrency = "CNY") {
    const labelByKey = new Map(accounts.map((account) => [account.key, account.label]));

    if (owners.length > 0) {
      return {
        type: "owned",
        text: `Owned: ${owners.map((key) => labelByKey.get(key) || key).join(", ")}`,
      };
    }

    const cheapest = rankedPrices.find((entry) => entry.available);
    if (!cheapest) {
      return { type: "none", text: "No comparable Steam price found" };
    }

    return {
      type: "buy",
      accountKey: cheapest.accountKey,
      text: `Best current price: ${cheapest.label}, ${formatDisplayAmount(cheapest.displayAmount, displayCurrency)}`,
    };
  }

  const api = {
    DEFAULT_ACCOUNTS,
    COUNTRY_OPTIONS,
    DISPLAY_CURRENCY_OPTIONS,
    findCountryOption,
    findDisplayCurrency,
    normalizeDisplayCurrency,
    extractAppId,
    normalizeCountryCode,
    normalizeAccounts,
    parsePriceOverview,
    normalizeStorePrice,
    minorToMajor,
    buildCnyRates,
    convertCurrencyAmount,
    rankRegionalPrices,
    parseOwnedAppIds,
    findOwners,
    formatDisplayAmount,
    buildRecommendation,
  };

  root.SteamMultiRegionHelperCore = api;
  root.SteamRegionBuyerCore = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);


const MILLENNIUM_IS_CLIENT_MODULE = false;
const pluginName = "steam-multi-region-helper";

function InitializePlugins() {
  const pluginList = (window.PLUGIN_LIST ||= {});
  pluginList[pluginName] ||= {};
  window.MILLENNIUM_SIDEBAR_NAVIGATION_PANELS ||= {};
}

InitializePlugins();

const __call_server_method__ = (method, args) => Millennium.callServerMethod(pluginName, method, args);
function __wrapped_callable__(method) {
  return method.startsWith("webkit:")
    ? MILLENNIUM_API.callable(
        (name, args) => MILLENNIUM_API.__INTERNAL_CALL_WEBKIT_METHOD__(pluginName, name, args),
        method.replace(/^webkit:/, "")
      )
    : MILLENNIUM_API.callable(__call_server_method__, method);
}

let PluginEntryPointMain = function () {
  return (function createPlugin(exports) {
    "use strict";

    const core = window.SteamMultiRegionHelperCore || window.SteamRegionBuyerCore;
    const getOwnedGames = __wrapped_callable__("GetOwnedGames");

    const PANEL_ID = "steam-region-helper-panel";
    const STYLE_ID = "steam-region-helper-style";
    const SETTINGS_KEY = "smrh_settings_v2";
    const LEGACY_SETTINGS_KEY = "srb_settings_v1";
    const OWNED_CACHE_KEY = "smrh_owned_cache_v2";
    const RATES_CACHE_KEY = "smrh_rates_cache_v1";

    function readJson(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    }

    function writeJson(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function defaultSettings() {
      return {
        apiKey: "",
        displayCurrency: "CNY",
        accounts: core.DEFAULT_ACCOUNTS.map((account) => ({ ...account })),
      };
    }

    function migrateLegacySettings() {
      const legacy = readJson(LEGACY_SETTINGS_KEY, null);
      if (!legacy || localStorage.getItem(SETTINGS_KEY)) return null;

      const defaults = defaultSettings();
      const legacyOrder = [
        ["cn", "China", "CN"],
        ["ru", "Russia", "RU"],
        ["tr", "Turkey/MENA", "TR"],
        ["ua", "Ukraine", "UA"],
      ];

      return {
        apiKey: legacy.apiKey || "",
        displayCurrency: "CNY",
        accounts: legacyOrder.map(([key, label, cc]) => ({
          key,
          label,
          cc,
          steamId: legacy.accounts?.[key]?.steamId || "",
        })),
      };
    }

    function getSettings() {
      const stored = readJson(SETTINGS_KEY, null) || migrateLegacySettings() || defaultSettings();
      const settings = {
        ...defaultSettings(),
        ...stored,
        displayCurrency: core.normalizeDisplayCurrency(stored.displayCurrency),
        accounts: core.normalizeAccounts(stored.accounts).length
          ? core.normalizeAccounts(stored.accounts)
          : defaultSettings().accounts,
      };

      if (!localStorage.getItem(SETTINGS_KEY)) {
        writeJson(SETTINGS_KEY, settings);
      }

      return settings;
    }

    function getActiveAccounts(settings) {
      return core.normalizeAccounts(settings.accounts).filter((account) => account.cc);
    }

    function hasRequiredSettings(settings) {
      const accounts = getActiveAccounts(settings);
      return Boolean(settings.apiKey && accounts.some((account) => account.steamId));
    }

    function injectStyles() {
      if (document.getElementById(STYLE_ID)) return;

      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `
        #${PANEL_ID} {
          background: #141d26;
          border: 1px solid rgba(255,255,255,.14);
          color: #d8e4ef;
          font-family: Arial, Helvetica, sans-serif;
          margin: 16px 0;
          padding: 14px;
        }
        #${PANEL_ID} * { box-sizing: border-box; }
        .smrh-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .smrh-title { color: #fff; font-size: 16px; font-weight: 700; }
        .smrh-sub { color: #8fa7bd; font-size: 12px; margin-top: 2px; }
        .smrh-actions { display: flex; gap: 6px; }
        .smrh-btn { background: #2d8fca; border: 0; color: #fff; cursor: pointer; font-size: 12px; min-height: 30px; padding: 6px 10px; }
        .smrh-btn:hover { background: #43a8e2; }
        .smrh-btn.secondary { background: rgba(255,255,255,.12); }
        .smrh-btn.secondary:hover { background: rgba(255,255,255,.2); }
        .smrh-note { background: rgba(255,193,7,.13); color: #ffd36a; font-size: 12px; line-height: 1.45; padding: 8px; }
        .smrh-error { background: rgba(220,53,69,.18); color: #ff9ba6; font-size: 12px; line-height: 1.45; padding: 8px; }
        .smrh-rec { background: #0f765d; color: #fff; font-size: 14px; font-weight: 700; margin-bottom: 10px; padding: 9px 10px; }
        .smrh-grid { display: grid; gap: 6px; }
        .smrh-row { align-items: center; background: rgba(255,255,255,.055); display: grid; gap: 8px; grid-template-columns: minmax(96px,1fr) minmax(112px,1.35fr) minmax(54px,.75fr); min-height: 38px; padding: 7px 9px; }
        .smrh-row.best { border-left: 3px solid #7ad77a; }
        .smrh-row.owned { background: rgba(122,215,122,.14); }
        .smrh-region { color: #fff; font-weight: 700; }
        .smrh-price { display: flex; flex-direction: column; gap: 2px; }
        .smrh-price small { color: #9fb3c6; font-size: 11px; }
        .smrh-status { color: #9ee493; font-size: 12px; text-align: right; }
        .smrh-form { display: grid; gap: 8px; }
        .smrh-field { display: grid; gap: 4px; }
        .smrh-field label { color: #b9c9d8; font-size: 12px; }
        .smrh-field input,
        .smrh-field select { background: #1b2a38; border: 1px solid rgba(255,255,255,.16); color: #fff; min-height: 32px; padding: 6px 8px; width: 100%; }
        .smrh-field input:focus,
        .smrh-field select:focus { border-color: #66c0f4; outline: none; }
        .smrh-account-list { display: grid; gap: 8px; }
        .smrh-account-row { align-items: end; display: grid; gap: 8px; grid-template-columns: minmax(128px,1fr) minmax(80px,.9fr) 64px minmax(128px,1.4fr) auto; }
        .smrh-foot { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
        .smrh-link { color: #66c0f4; font-size: 12px; }
        @media (max-width: 760px) {
          .smrh-account-row, .smrh-row { grid-template-columns: 1fr; }
          .smrh-status { text-align: left; }
        }
      `;
      document.head.appendChild(style);
    }

    function getOrCreatePanel() {
      injectStyles();
      let panel = document.getElementById(PANEL_ID);
      if (panel) return panel;

      panel = document.createElement("section");
      panel.id = PANEL_ID;

      const target =
        document.querySelector("#game_area_purchase") ||
        document.querySelector(".game_area_purchase_game_wrapper") ||
        document.querySelector(".rightcol") ||
        document.body;

      if (target === document.body) {
        document.body.prepend(panel);
      } else {
        target.insertAdjacentElement("afterend", panel);
      }

      return panel;
    }

    function bindActions(panel) {
      panel.querySelectorAll("[data-smrh-action='settings']").forEach((button) => {
        button.addEventListener("click", () => renderSettings(panel));
      });
      panel.querySelectorAll("[data-smrh-action='refresh']").forEach((button) => {
        button.addEventListener("click", () => loadCurrentApp({ forceRefresh: true }));
      });
      panel.querySelectorAll("[data-smrh-action='reload']").forEach((button) => {
        button.addEventListener("click", () => loadCurrentApp());
      });
    }

    function renderShell(panel, body, settings = getSettings()) {
      const accounts = getActiveAccounts(settings);
      const subtitle = accounts.length ? accounts.map((account) => account.cc).join(" / ") : "No regions configured";
      panel.innerHTML = `
        <div class="smrh-head">
          <div>
            <div class="smrh-title">Steam Multi-Region Helper</div>
            <div class="smrh-sub">${escapeHtml(subtitle)}</div>
          </div>
          <div class="smrh-actions">
            <button class="smrh-btn secondary" data-smrh-action="refresh" title="Refresh">Refresh</button>
            <button class="smrh-btn secondary" data-smrh-action="settings" title="Settings">Settings</button>
          </div>
        </div>
        ${body}
      `;
      bindActions(panel);
    }

    function renderLoading(panel) {
      renderShell(panel, `<div class="smrh-note">Loading configured regional prices and owned status...</div>`);
    }

    function renderError(panel, message) {
      renderShell(panel, `<div class="smrh-error">${escapeHtml(message)}</div>`);
    }

    function accountRow(account, index) {
      const matchedCountry = core.findCountryOption(account.cc);
      const countryValue = matchedCountry ? matchedCountry.cc : "__custom__";
      const countryOptions = core.COUNTRY_OPTIONS.map(
        (country) =>
          `<option value="${escapeHtml(country.cc)}"${country.cc === countryValue ? " selected" : ""}>${escapeHtml(country.label)} (${escapeHtml(country.cc)})</option>`
      ).join("");

      return `
        <div class="smrh-account-row" data-index="${index}">
          <div class="smrh-field">
            <label>Country / region</label>
            <select name="preset_${index}" data-smrh-country="${index}">
              ${countryOptions}
              <option value="__custom__"${countryValue === "__custom__" ? " selected" : ""}>Custom country code</option>
            </select>
          </div>
          <div class="smrh-field">
            <label>Name</label>
            <input name="label_${index}" autocomplete="off" value="${escapeHtml(account.label)}" placeholder="China">
          </div>
          <div class="smrh-field">
            <label>CC</label>
            <input name="cc_${index}" maxlength="2" autocomplete="off" value="${escapeHtml(account.cc)}" placeholder="CN">
          </div>
          <div class="smrh-field">
            <label>SteamID64</label>
            <input name="steamId_${index}" inputmode="numeric" autocomplete="off" value="${escapeHtml(account.steamId)}">
          </div>
          <button class="smrh-btn secondary" type="button" data-smrh-remove="${index}">Remove</button>
        </div>
      `;
    }

    function currencyOptions(selectedCurrency) {
      const current = core.normalizeDisplayCurrency(selectedCurrency);
      return core.DISPLAY_CURRENCY_OPTIONS.map(
        (currency) =>
          `<option value="${escapeHtml(currency.code)}"${currency.code === current ? " selected" : ""}>${escapeHtml(currency.code)} - ${escapeHtml(currency.label)}</option>`
      ).join("");
    }

    function collectSettings(form) {
      const formData = new FormData(form);
      const accountRows = Array.from(form.querySelectorAll(".smrh-account-row"));
      const accounts = accountRows.map((row, nextIndex) => {
        const index = row.getAttribute("data-index");
        const label = String(formData.get(`label_${index}`) || "").trim();
        const preset = String(formData.get(`preset_${index}`) || "").trim().toUpperCase();
        const cc =
          preset && preset !== "__CUSTOM__"
            ? preset
            : String(formData.get(`cc_${index}`) || "").trim().toUpperCase();
        const steamId = String(formData.get(`steamId_${index}`) || "").trim();
        const keyBase = `${cc || label || "account"}_${nextIndex + 1}`;
        return { key: keyBase.toLowerCase().replace(/[^a-z0-9_-]/g, ""), label, cc, steamId };
      });

      return {
        apiKey: String(formData.get("apiKey") || "").trim(),
        displayCurrency: core.normalizeDisplayCurrency(formData.get("displayCurrency")),
        accounts: core.normalizeAccounts(accounts),
      };
    }

    function renderSettings(panel) {
      const settings = getSettings();
      const accounts = getActiveAccounts(settings);
      const editableAccounts = accounts.length ? accounts : defaultSettings().accounts;

      panel.innerHTML = `
        <div class="smrh-head">
          <div>
            <div class="smrh-title">Settings</div>
            <div class="smrh-sub">Add only the regions and accounts you actually use.</div>
          </div>
        </div>
        <form class="smrh-form" id="smrh-settings-form">
          <div class="smrh-field">
            <label>Steam Web API Key</label>
            <input name="apiKey" type="password" autocomplete="off" value="${escapeHtml(settings.apiKey)}">
          </div>
          <div class="smrh-field">
            <label>Display currency</label>
            <select name="displayCurrency">
              ${currencyOptions(settings.displayCurrency)}
            </select>
          </div>
          <div class="smrh-account-list" id="smrh-account-list">
            ${editableAccounts.map(accountRow).join("")}
          </div>
          <div>
            <button class="smrh-btn secondary" type="button" id="smrh-add-account">Add region</button>
          </div>
          <div class="smrh-foot">
            <button class="smrh-btn secondary" type="button" data-smrh-action="reload">Cancel</button>
            <button class="smrh-btn" type="submit">Save</button>
          </div>
        </form>
      `;

      const form = panel.querySelector("#smrh-settings-form");
      const list = panel.querySelector("#smrh-account-list");

      panel.querySelector("#smrh-add-account").addEventListener("click", () => {
        const nextIndex = list.querySelectorAll(".smrh-account-row").length;
        list.insertAdjacentHTML("beforeend", accountRow({ key: "", label: "", cc: "", steamId: "" }, nextIndex));
        bindRemoveButtons();
        bindCountrySelectors();
      });

      function bindCountrySelectors() {
        panel.querySelectorAll("[data-smrh-country]").forEach((select) => {
          select.onchange = () => {
            const row = select.closest(".smrh-account-row");
            const labelInput = row?.querySelector("input[name^='label_']");
            const ccInput = row?.querySelector("input[name^='cc_']");
            const selected = core.findCountryOption(select.value);
            if (!row || !labelInput || !ccInput) return;
            if (selected) {
              if (!labelInput.value.trim()) labelInput.value = selected.label;
              ccInput.value = selected.cc;
              ccInput.readOnly = true;
            } else {
              ccInput.readOnly = false;
              ccInput.focus();
            }
          };
          select.onchange();
        });
      }

      function bindRemoveButtons() {
        panel.querySelectorAll("[data-smrh-remove]").forEach((button) => {
          button.onclick = () => {
            button.closest(".smrh-account-row")?.remove();
          };
        });
      }

      bindRemoveButtons();
      bindCountrySelectors();

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const next = collectSettings(form);
        writeJson(SETTINGS_KEY, next);
        localStorage.removeItem(OWNED_CACHE_KEY);
        loadCurrentApp({ forceRefresh: true });
      });

      bindActions(panel);
    }

    async function fetchStorePrice(appId, account) {
      const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&cc=${encodeURIComponent(account.cc)}&filters=price_overview`;
      const response = await fetch(url, { credentials: "omit" });
      const data = await response.json();
      return core.normalizeStorePrice(appId, account, data);
    }

    async function loadRates() {
      const cached = readJson(RATES_CACHE_KEY, null);
      if (cached && Date.now() - cached.createdAt < 6 * 60 * 60 * 1000) {
        return cached.rates;
      }

      try {
        const response = await fetch("https://open.er-api.com/v6/latest/CNY", { credentials: "omit" });
        const data = await response.json();
        const rates = core.buildCnyRates(data);
        writeJson(RATES_CACHE_KEY, { createdAt: Date.now(), rates });
        return rates;
      } catch {
        return { CNY: 1, USD: 7.25, UAH: 0.18, RUB: 0.08, TRY: 0.22 };
      }
    }

    async function loadOwned(settings, accounts, forceRefresh) {
      const cache = readJson(OWNED_CACHE_KEY, {});
      const cacheSignature = JSON.stringify(accounts.map((account) => [account.key, account.cc, account.steamId || ""]));

      if (
        !forceRefresh &&
        cache.signature === cacheSignature &&
        Date.now() - Number(cache.createdAt || 0) < 24 * 60 * 60 * 1000
      ) {
        return {
          ownedByAccount: Object.fromEntries(
            Object.entries(cache.owned || {}).map(([key, appIds]) => [key, new Set(appIds.map(String))])
          ),
          errors: cache.errors || {},
        };
      }

      const apiAccounts = accounts
        .map((account) => ({
          accountKey: account.key,
          regionKey: account.key,
          steamId: account.steamId || "",
        }))
        .filter((account) => account.steamId);

      const raw = await getOwnedGames({
        request: JSON.stringify({
          apiKey: settings.apiKey,
          accounts: apiAccounts,
        }),
      });

      const payload = JSON.parse(raw || "{}");
      if (payload.status !== "ok") {
        throw new Error(payload.message || "owned_games_failed");
      }

      const ownedByAccount = {};
      const serializableOwned = {};
      const errors = {};

      for (const account of accounts) {
        const result = payload.results && payload.results[account.key];
        if (!account.steamId) {
          ownedByAccount[account.key] = new Set();
          serializableOwned[account.key] = [];
          continue;
        }

        if (!result || result.status !== "ok") {
          errors[account.key] = result?.message || "request_failed";
          ownedByAccount[account.key] = new Set();
          serializableOwned[account.key] = [];
          continue;
        }

        const ids = Array.from(core.parseOwnedAppIds(result.body));
        ownedByAccount[account.key] = new Set(ids);
        serializableOwned[account.key] = ids;
      }

      writeJson(OWNED_CACHE_KEY, {
        createdAt: Date.now(),
        signature: cacheSignature,
        owned: serializableOwned,
        errors,
      });

      return { ownedByAccount, errors };
    }

    function renderSummary(panel, appId, accounts, accountPrices, rates, ownedResult, settings) {
      const owners = core.findOwners(appId, ownedResult.ownedByAccount, accounts);
      const displayCurrency = core.normalizeDisplayCurrency(settings.displayCurrency);
      const ranked = core.rankRegionalPrices(accountPrices, rates, displayCurrency);
      const recommendation = core.buildRecommendation(owners, ranked, accounts, displayCurrency);
      const rankedByAccount = new Map(ranked.map((entry) => [entry.accountKey, entry]));
      const cheapest = ranked.find((entry) => entry.available);

      const rows = accountPrices
        .map((entry) => {
          const rank = rankedByAccount.get(entry.accountKey);
          const owned = owners.includes(entry.accountKey);
          const best = cheapest && cheapest.accountKey === entry.accountKey;
          const priceText = entry.price.available
            ? entry.price.finalFormatted || `${(entry.price.finalMinor / 100).toFixed(2)} ${entry.price.currency}`
            : "No price";
          const displayText = rank ? core.formatDisplayAmount(rank.displayAmount, displayCurrency) : "";

          return `
            <div class="smrh-row${owned ? " owned" : ""}${best ? " best" : ""}">
              <div class="smrh-region">${escapeHtml(entry.label)} <span class="smrh-sub">(${escapeHtml(entry.cc)})</span></div>
              <div class="smrh-price">
                <span>${escapeHtml(priceText)}</span>
                ${displayText ? `<small>${escapeHtml(displayText)}</small>` : ""}
              </div>
              <div class="smrh-status">${owned ? "Owned" : ""}</div>
            </div>
          `;
        })
        .join("");

      const labelByKey = new Map(accounts.map((account) => [account.key, account.label]));
      const errors = Object.entries(ownedResult.errors || {})
        .map(([key, value]) => `${labelByKey.get(key) || key}: ${value}`)
        .join("; ");

      renderShell(
        panel,
        `
          <div class="smrh-rec">${escapeHtml(recommendation.text)}</div>
          <div class="smrh-grid">${rows}</div>
          ${errors ? `<div class="smrh-note" style="margin-top:10px">Some owned-game reads failed: ${escapeHtml(errors)}</div>` : ""}
          <div style="margin-top:10px">
            <a class="smrh-link" href="https://steamdb.info/app/${encodeURIComponent(appId)}/" target="_blank" rel="noreferrer">Check SteamDB manually</a>
          </div>
        `
      );
    }

    async function loadCurrentApp({ forceRefresh = false } = {}) {
      const appId = core.extractAppId(location.href);
      if (!appId) return;

      const panel = getOrCreatePanel();
      const settings = getSettings();
      const accounts = getActiveAccounts(settings);

      if (!hasRequiredSettings(settings)) {
        renderShell(
          panel,
          `<div class="smrh-note">Add a Steam Web API Key and at least one SteamID64.</div>
           <div class="smrh-foot"><button class="smrh-btn" data-smrh-action="settings">Open settings</button></div>`,
          settings
        );
        return;
      }

      renderLoading(panel);

      try {
        const [accountPrices, rates, ownedResult] = await Promise.all([
          Promise.all(accounts.map((account) => fetchStorePrice(appId, account))),
          loadRates(),
          loadOwned(settings, accounts, forceRefresh),
        ]);
        renderSummary(panel, appId, accounts, accountPrices, rates, ownedResult, settings);
      } catch (error) {
        renderError(panel, error?.message || "Load failed");
      }
    }

    let lastAppId = null;
    function watchUrl() {
      const appId = core.extractAppId(location.href);
      if (appId && appId !== lastAppId) {
        lastAppId = appId;
        loadCurrentApp();
      }
    }

    exports.default = async function main() {
      if (window.__steamMultiRegionHelperLoaded) return;
      window.__steamMultiRegionHelperLoaded = true;
      console.info("[Steam Multi-Region Helper] webkit active");
      watchUrl();
      setInterval(watchUrl, 1000);
    };

    Object.defineProperty(exports, "__esModule", { value: true });
    return exports;
  })({});
};

async function ExecutePluginModule() {
  const plugin = PluginEntryPointMain();
  Object.assign(window.PLUGIN_LIST[pluginName], {
    ...plugin,
    __millennium_internal_plugin_name_do_not_use_or_change__: pluginName,
  });
  await plugin.default();
}

ExecutePluginModule();


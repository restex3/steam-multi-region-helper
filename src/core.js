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

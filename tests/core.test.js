const assert = require("assert");
const core = require("../src/core.js");

assert.ok(core.COUNTRY_OPTIONS.some((country) => country.cc === "CN" && country.label === "China"));
assert.deepStrictEqual(core.findCountryOption("tr"), { cc: "TR", label: "Turkey/MENA" });
assert.deepStrictEqual(core.findCountryOption("ua"), { cc: "UA", label: "Ukraine" });
assert.strictEqual(core.findCountryOption("zz"), null);

assert.strictEqual(
  core.extractAppId("https://store.steampowered.com/app/1091500/Cyberpunk_2077/"),
  "1091500"
);
assert.strictEqual(core.extractAppId("https://store.steampowered.com/agecheck/app/1091500/"), null);

assert.deepStrictEqual(
  core.normalizeAccounts([
    { key: "cn", label: "China", cc: "cn", steamId: "76561198000000000" },
    { key: "jp", label: "Japan", cc: "JP", steamId: "" },
    { key: "bad", label: "Bad", cc: "china", steamId: "" },
  ]),
  [
    { key: "cn", label: "China", cc: "CN", steamId: "76561198000000000" },
    { key: "jp", label: "Japan", cc: "JP", steamId: "" },
  ]
);

assert.deepStrictEqual(core.parsePriceOverview(null), { available: false, reason: "no_price" });

assert.deepStrictEqual(
  core.parsePriceOverview({
    currency: "CNY",
    initial: 29800,
    final: 8940,
    discount_percent: 70,
    final_formatted: "¥ 89.40",
  }),
  {
    available: true,
    currency: "CNY",
    initialMinor: 29800,
    finalMinor: 8940,
    discountPercent: 70,
    initialFormatted: "",
    finalFormatted: "¥ 89.40",
  }
);

assert.ok(core.DISPLAY_CURRENCY_OPTIONS.some((currency) => currency.code === "USD"));
assert.deepStrictEqual(core.findDisplayCurrency("jpy"), { code: "JPY", label: "Japanese Yen" });
assert.strictEqual(core.findDisplayCurrency("bad"), null);
assert.strictEqual(core.normalizeDisplayCurrency("bad"), "CNY");

const cnyRates = core.buildCnyRates({ rates: { USD: 0.1375, UAH: 5.72, RUB: 10.9, JPY: 21.6 } });
assert.strictEqual(cnyRates.CNY, 1);
assert.ok(cnyRates.USD > 7 && cnyRates.USD < 8);
assert.ok(core.convertCurrencyAmount(100, "CNY", "USD", cnyRates) > 13);
assert.ok(core.convertCurrencyAmount(100, "CNY", "USD", cnyRates) < 14);

const accounts = [
  { key: "cn", label: "China", cc: "CN", steamId: "1" },
  { key: "us", label: "US", cc: "US", steamId: "2" },
  { key: "ru", label: "Russia", cc: "RU", steamId: "3" },
];

const ranked = core.rankRegionalPrices(
  [
    { accountKey: "cn", label: "China", price: { available: true, currency: "CNY", finalMinor: 8940 } },
    { accountKey: "us", label: "US", price: { available: true, currency: "USD", finalMinor: 1349 } },
    { accountKey: "ru", label: "Russia", price: { available: false } },
  ],
  cnyRates,
  "CNY"
);
assert.strictEqual(ranked[0].accountKey, "cn");
assert.strictEqual(ranked[2].available, false);
assert.strictEqual(ranked[0].displayCurrency, "CNY");

const usdRanked = core.rankRegionalPrices(
  [
    { accountKey: "cn", label: "China", price: { available: true, currency: "CNY", finalMinor: 8940 } },
    { accountKey: "us", label: "US", price: { available: true, currency: "USD", finalMinor: 1349 } },
  ],
  cnyRates,
  "USD"
);
assert.strictEqual(usdRanked[0].displayCurrency, "USD");
assert.ok(usdRanked[0].displayAmount > 12);
assert.strictEqual(core.formatDisplayAmount(usdRanked[0].displayAmount, "USD"), "approx USD 12.29");

const owned = {
  cn: core.parseOwnedAppIds({ response: { games: [{ appid: 1091500 }] } }),
  us: core.parseOwnedAppIds('{"response":{"games":[{"appid":570}]}}'),
};
assert.deepStrictEqual(core.findOwners("1091500", owned, accounts), ["cn"]);

assert.strictEqual(core.buildRecommendation(["cn"], ranked, accounts).type, "owned");
assert.strictEqual(core.buildRecommendation([], ranked, accounts, "CNY").accountKey, "cn");

console.log("core tests passed");

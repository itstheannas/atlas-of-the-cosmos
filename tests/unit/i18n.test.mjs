import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultLocale,
  formatDateTime,
  formatNumber,
  getUiCopy,
  localeDirection,
  navigationItems,
  uiCopy,
  validateTranslationKeys,
} from "../../lib/i18n.ts";

test("the English chrome resource is complete and is the safe fallback", () => {
  assert.deepEqual(validateTranslationKeys(), [
    { locale: "en", missing: [], extra: [] },
  ]);
  assert.equal(getUiCopy(defaultLocale), uiCopy.en);
  assert.equal(getUiCopy("not-a-supported-locale"), uiCopy.en);
  assert.equal(
    navigationItems.every((item) => Boolean(uiCopy.en.navigation[item.id])),
    true,
  );
});

test("translation validation reports missing and extra leaf keys", () => {
  const reports = validateTranslationKeys({
    en: { action: "Open", nested: { label: "Label" } },
    ar: { action: "افتح", unexpected: "قيمة" },
  });

  assert.deepEqual(reports, [
    { locale: "en", missing: [], extra: [] },
    {
      locale: "ar",
      missing: ["nested.label"],
      extra: ["unexpected"],
    },
  ]);
});

test("locale direction resolves RTL language subtags and defaults safely", () => {
  assert.equal(localeDirection("en"), "ltr");
  assert.equal(localeDirection("en-GB"), "ltr");
  assert.equal(localeDirection("ar"), "rtl");
  assert.equal(localeDirection("fa_IR"), "rtl");
  assert.equal(localeDirection("HE-il"), "rtl");
  assert.equal(localeDirection("az-Arab"), "rtl");
  assert.equal(localeDirection("ku-Latn"), "ltr");
  assert.equal(localeDirection(""), "ltr");
});

test("number and date formatting honour the requested locale", () => {
  const value = 1234.5;
  assert.equal(
    formatNumber(value, "de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    new Intl.NumberFormat("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value),
  );

  const instant = new Date("2026-01-02T03:04:05.000Z");
  assert.equal(
    formatDateTime(instant, "en-GB", {
      dateStyle: "medium",
      timeZone: "UTC",
    }),
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(instant),
  );
});

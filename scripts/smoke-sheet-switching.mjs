import { chromium } from "playwright";

const url = process.env.SMOKE_URL ?? "http://127.0.0.1:5177/sheet";
const STORAGE_KEY = "p0020:sheet:sources:v1";
const sources = [
  {
    id: "smoke_sheet_class_data",
    title: "Class Data",
    rawUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0",
    csvUrl: "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv&gid=0",
    gid: "0",
    createdAt: "2026-06-25T00:00:00.000Z",
    lastSyncedAt: "2026-06-25T00:00:00.000Z",
    titleSource: "auto",
    headerRowIndex: 0,
  },
  {
    id: "smoke_sheet_countries",
    title: "Countries CSV",
    rawUrl: "https://example.com/countries",
    csvUrl: "https://raw.githubusercontent.com/cs109/2014_data/master/countries.csv",
    gid: "1",
    createdAt: "2026-06-25T00:00:01.000Z",
    lastSyncedAt: "2026-06-25T00:00:01.000Z",
    titleSource: "manual",
    headerRowIndex: 0,
  },
];

async function firstCellText(page) {
  await page.waitForSelector(".sheet-panel tbody tr td:first-child button, .sheet-panel tbody tr td:first-child", {
    timeout: 30000,
  });
  return page.locator(".sheet-panel tbody tr td:first-child").first().innerText();
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.addInitScript(
    ({ storageKey, rows }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(rows));
    },
    { storageKey: STORAGE_KEY, rows: sources },
  );

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector(".sheet-rail tbody tr", { timeout: 30000 });

  const countriesRow = page.locator(".sheet-rail tbody tr", { hasText: "Countries CSV" });
  await countriesRow.locator("button").first().click();
  const countriesCell = (await firstCellText(page)).trim();
  if (countriesCell !== "Algeria") {
    throw new Error(`expected Countries CSV first cell to be Algeria, got ${JSON.stringify(countriesCell)}`);
  }

  const classRow = page.locator(".sheet-rail tbody tr", { hasText: "Class Data" });
  await classRow.locator("button").first().click();
  const classCell = (await firstCellText(page)).trim();
  if (classCell !== "Alexandra") {
    throw new Error(`expected Class Data first cell to be Alexandra, got ${JSON.stringify(classCell)}`);
  }

  console.log(`smoke-sheet-switching: ok (${countriesCell} -> ${classCell})`);
} finally {
  await browser.close();
}

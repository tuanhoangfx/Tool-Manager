import { chromium } from "playwright";

const url = process.env.SMOKE_URL ?? "http://127.0.0.1:5177/sheet";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("table.sheet-grid-table thead th.sheet-grid-th--resizable", { timeout: 20000 });

  const count = await page.locator("th.sheet-grid-th--resizable").count();
  if (count < 1) throw new Error(`expected resizable headers, found ${count}`);

  const widthBefore = await page.evaluate(() => {
    const col = document.querySelector("table.sheet-grid-table colgroup col");
    return col?.getAttribute("style") ?? "";
  });

  const th = page.locator("th.sheet-grid-th--resizable").first();
  const box = await th.boundingBox();
  if (!box) throw new Error("resizable th has no bounding box");

  const x = box.x + box.width - 4;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 48, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const widthAfter = await page.evaluate(() => {
    const col = document.querySelector("table.sheet-grid-table colgroup col");
    return col?.getAttribute("style") ?? "";
  });

  if (!widthAfter || widthAfter === widthBefore) {
    throw new Error(`column width did not change: before=${JSON.stringify(widthBefore)} after=${JSON.stringify(widthAfter)}`);
  }

  console.log(`smoke-sheet-col-resize: ok (${widthBefore || "auto"} -> ${widthAfter})`);
} finally {
  await browser.close();
}

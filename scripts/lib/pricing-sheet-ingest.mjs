/**
 * Parse Infi Docs / Czp Docs Google Sheet CSV → structured pricing cards.
 * SSOT for ingest — used by P0020 sync + P0016 corpus ingest.
 */

export const INFI28_SHEET_ID = "1lbywBrXnQ1sw6IChfWPlS-sjKp-SJ7pNBtsPL4jCaoo";
export const INFI28_FAQ_GID = "1075393871";
export const INFI28_PRICING_CATALOG_ID = "infi28-payment";

export function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      cells.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

/** Structured pricing cards per platform — header, bullets, warranty, tip (from sheet blocks). */
export function extractPricingCardsFromCsv(text) {
  const cards = new Map();
  let platIdx = 2;
  let catIdx = 3;
  let aIdx = 5;
  let qIdx = 4;
  let headerDone = false;
  let currentPlatform = "";
  let inPricingBlock = false;
  let currentSectionIsUpdate = false;

  const normalizePlatform = (raw) =>
    String(raw ?? "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim();

  const isValidPlatformName = (name) =>
    Boolean(name) &&
    name.length >= 2 &&
    name.length <= 30 &&
    /^[A-Za-zÀ-ỹ]/.test(name) &&
    !/\d+[kKmM]|tháng|năm|giá gốc|\$/i.test(name) &&
    !/^update\b|^information$/i.test(name);

  const isPricingRow = (cells, joined) =>
    /^•\s*#\d+/i.test(cells[0]) ||
    (/^•\s+[A-Za-zÀ-ỹ#]/i.test(cells[0]) &&
      /giá gốc|\d+\s*[kKmM]\/|\d+K\/tháng/i.test(joined)) ||
    (/giá gốc/i.test(joined) && /\d+\s*[kKmM]\/|\d+K\/tháng/i.test(joined));

  const cardKey = (platform) => platform.toLowerCase().replace(/\s+/g, " ").trim();

  const ensureCard = (platform) => {
    const key = cardKey(platform);
    if (!cards.has(key)) {
      cards.set(key, { platform, header: `💳 ${platform}`, bullets: [], extras: [] });
    }
    return cards.get(key);
  };

  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const cells = parseCsvLine(raw).map((c) => c.trim());

    if (!headerDone) {
      const low = cells.map((c) => c.toLowerCase());
      const pi = low.findIndex((c) => c.includes("platform"));
      const ci = low.findIndex((c) => c.includes("category"));
      const ai = low.findIndex((c) => c.includes("answer"));
      const qi = low.findIndex((c) => c.includes("question"));
      if (pi >= 0) {
        platIdx = pi;
        if (ci >= 0) catIdx = ci;
        if (ai >= 0) aIdx = ai;
        if (qi >= 0) qIdx = qi;
        headerDone = true;
        continue;
      }
    }

    const firstCell = String(cells[0] ?? "").trim();
    const platformCell = normalizePlatform(cells[platIdx]);
    const categoryCell = String(cells[catIdx] ?? "").toLowerCase();
    const questionCell = String(cells[qIdx] ?? "").toLowerCase();
    const answerCell = String(cells[aIdx] ?? cells[cells.length - 1] ?? "").trim();
    const isSectionHeader = !firstCell.startsWith("•") && !/^#?\d+\s*[-:]/i.test(firstCell);

    if (isSectionHeader && isValidPlatformName(platformCell)) {
      currentPlatform = platformCell;
      if (/setup|guide|hướng dẫn/i.test(categoryCell)) {
        inPricingBlock = false;
        continue;
      }
      if (/💳/.test(answerCell)) {
        const card = ensureCard(currentPlatform);
        const headerMatch = answerCell.match(/💳\s*[^\n|,]+/);
        card.header = headerMatch?.[0]?.trim() || `💳 ${currentPlatform}`;
        currentSectionIsUpdate = /update/i.test(questionCell);
        inPricingBlock = true;
      }
      continue;
    }

    if (
      (firstCell.startsWith("🛡️") || firstCell.startsWith("💡")) &&
      currentPlatform &&
      inPricingBlock
    ) {
      const card = ensureCard(currentPlatform);
      const extra = cells.filter(Boolean).join(" | ");
      if (!card.extras.some((e) => String(e).startsWith("🛡️"))) card.extras.push(extra);
      inPricingBlock = false;
      continue;
    }

    const nonEmpty = cells.filter(Boolean);
    if (!nonEmpty.length) continue;
    const joined = nonEmpty.join(" | ");
    if (!isPricingRow(nonEmpty, joined)) {
      if (inPricingBlock && firstCell && !firstCell.startsWith("•")) {
        inPricingBlock = false;
      }
      continue;
    }
    if (!currentPlatform || !inPricingBlock) continue;

    const card = ensureCard(currentPlatform);
    const hasWarranty = card.extras.some((e) => String(e).startsWith("🛡️"));
    if (hasWarranty && !currentSectionIsUpdate) continue;

    const bullet = joined.startsWith("•") ? joined : `• ${joined}`;
    if (!card.bullets.includes(bullet)) card.bullets.push(bullet);
  }

  const out = {};
  let sort = 0;
  for (const [key, card] of cards) {
    if (!card.bullets.length) continue;
    out[key] = {
      platform: card.platform,
      header: card.header,
      bullets: card.bullets,
      extras: card.extras,
      followUp: `em gửi thông tin upgrade ${card.platform} hiện tại`,
      sortOrder: sort++,
    };
  }
  return out;
}

export async function fetchInfiDocsFaqCsv(sheetId = INFI28_SHEET_ID, gid = INFI28_FAQ_GID) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`Sheet CSV HTTP ${res.status}`);
  return res.text();
}

export function cardsObjectToRows(catalogId, cards) {
  return Object.entries(cards).map(([platformKey, card]) => ({
    catalog_id: catalogId,
    platform_key: platformKey,
    platform_label: card.platform ?? platformKey,
    header: card.header ?? `💳 ${card.platform ?? platformKey}`,
    bullets: card.bullets ?? [],
    extras: card.extras ?? [],
    follow_up: card.followUp ?? null,
    sort_order: card.sortOrder ?? 0,
  }));
}

export function rowsToCardsObject(rows) {
  const out = {};
  for (const row of rows ?? []) {
    out[row.platform_key] = {
      platform: row.platform_label,
      header: row.header,
      bullets: row.bullets ?? [],
      extras: row.extras ?? [],
      followUp: row.follow_up ?? undefined,
    };
  }
  return out;
}

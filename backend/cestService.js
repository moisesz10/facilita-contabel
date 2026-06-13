// backend/cestService.js
// Simple CEST lookup based on NCM codes. In a real scenario this could be a DB or external API.
const cestMap = {
  "01012100": "01.001.01",
  "02021000": "02.001.01",
  // Add more NCM -> CEST mappings as needed
};

/**
 * Retrieve the CEST code for a given NCM (if known).
 * @param {string} ncm - NCM code (e.g., "01012100").
 * @returns {string|null} CEST code or null if not found.
 */
export function getCestForNcm(ncm) {
  return cestMap[ncm] ?? null;
}

/**
 * Enrich an invoice object with CEST codes for its items.
 * Assumes invoice has an `items` array where each item may contain `ncm` and `cest` fields.
 * If `cest` is missing and a mapping exists, it will be added.
 * @param {object} invoice - Invoice JSON object.
 * @returns {object} The same invoice object, mutated with CEST codes where applicable.
 */
export function enrichInvoiceWithCest(invoice) {
  if (!invoice || !Array.isArray(invoice.items)) return invoice;
  invoice.items = invoice.items.map((item) => {
    if (!item.cest && typeof item.ncm === "string") {
      const cest = getCestForNcm(item.ncm);
      if (cest) item.cest = cest;
    }
    return item;
  });
  return invoice;
}

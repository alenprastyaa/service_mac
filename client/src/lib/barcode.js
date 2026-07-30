// Barcode value conventions per entity — kept in one place so the generator
// (BarcodeLabelModal) and the scanner (ScanBarcodeModal) always agree.
//
// - Part MacBook (products) already has a unique SKU — used as-is.
// - Service MacBook (services) already has a unique ticket_no — used as-is.
// - Stock MacBook (macbooks): if the unit already has its own real-world code
//   (typed into Serial Number when the unit was added — e.g. copied off the
//   device's own barcode), that's used. Otherwise we fall back to a code
//   derived from its id: MB + id zero-padded to 6 digits.

export function macbookUnitCode(id) {
  return `MB${String(id).padStart(6, '0')}`;
}

// Returns the numeric id encoded in a macbookUnitCode, or null if the string
// doesn't match the expected MB###### shape.
export function parseMacbookUnitCode(code) {
  const match = /^MB0*(\d+)$/.exec((code || '').trim().toUpperCase());
  return match ? Number(match[1]) : null;
}

// The barcode value actually printed/scanned for a stock unit — prefers the
// serial number the user entered (their own device's barcode), else the
// auto-generated MB###### code.
export function macbookBarcodeValue(macbook) {
  return macbook.serial_number?.trim() || macbookUnitCode(macbook.id);
}

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, formatDateTime, STATUS_LABELS } from './format';
import logoUrl from '../assets/logo.png';

// Text-based report PDFs — built with real vector text + jspdf-autotable instead of
// screenshotting the on-screen preview. This means: pagination is handled by autoTable
// itself (a row that doesn't fit moves whole to the next page, never sliced in half),
// text stays crisp/selectable, and file size is tiny compared to an image-based PDF.

const PAGE_WIDTH = 210;
const MARGIN = 14;
const COLORS = {
  brand: [249, 115, 22],
  blue: [59, 130, 246],
  emerald: [16, 185, 129],
  red: [239, 68, 68],
  dark: [38, 38, 38],
};

let logoDataUrlPromise = null;
function loadLogoDataUrl() {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(logoUrl)
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      );
  }
  return logoDataUrlPromise;
}

// Draws the branded header (logo, title, store name, period) and returns the y
// position where content below it should start.
async function drawHeader(doc, { title, store, periodLabel }) {
  try {
    const logoData = await loadLogoDataUrl();
    const props = doc.getImageProperties(logoData);
    const logoHeight = 14;
    const logoWidth = (props.width / props.height) * logoHeight;
    doc.addImage(logoData, 'PNG', MARGIN, 10, logoWidth, logoHeight, undefined, 'FAST');
  } catch (err) {
    // logo failed to load — proceed without it rather than failing the whole report
  }

  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, PAGE_WIDTH - MARGIN, 17, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115);
  doc.text(`${store.store_name || 'Oren MacStore'} · ${periodLabel}`, PAGE_WIDTH - MARGIN, 23, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(163, 163, 163);
  doc.text(`Dicetak ${formatDateTime(new Date())}`, PAGE_WIDTH - MARGIN, 28, { align: 'right' });

  doc.setDrawColor(229, 229, 229);
  doc.line(MARGIN, 34, PAGE_WIDTH - MARGIN, 34);
  return 40;
}

// Draws up to 3 colored summary boxes side by side and returns the y position
// where the table below it should start.
function drawSummaryBoxes(doc, boxes, startY) {
  const gap = 4;
  const boxWidth = (PAGE_WIDTH - MARGIN * 2 - gap * (boxes.length - 1)) / boxes.length;
  const boxHeight = 20;

  boxes.forEach((box, i) => {
    const x = MARGIN + i * (boxWidth + gap);
    doc.setFillColor(...box.color);
    doc.roundedRect(x, startY, boxWidth, boxHeight, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(box.label, x + 4, startY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(box.value, x + 4, startY + 13);
    if (box.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(box.sub, x + 4, startY + 18);
    }
  });

  return startY + boxHeight + 8;
}

function drawFooter(doc, storeName) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(229, 229, 229);
    doc.line(MARGIN, pageHeight - 14, PAGE_WIDTH - MARGIN, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(163, 163, 163);
    doc.text(storeName || 'Oren MacStore', MARGIN, pageHeight - 9);
    doc.text(`Halaman ${i} / ${pageCount}`, PAGE_WIDTH - MARGIN, pageHeight - 9, { align: 'right' });
  }
}

const TABLE_THEME = {
  headStyles: { fillColor: COLORS.brand, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
  bodyStyles: { fontSize: 8.5, textColor: [38, 38, 38] },
  alternateRowStyles: { fillColor: [250, 250, 250] },
  margin: { left: MARGIN, right: MARGIN },
};

export async function buildSalesReportPdf(rows, store, from, to) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const startY = await drawHeader(doc, { title: 'LAPORAN PENJUALAN', store, periodLabel: `${formatDate(from)} – ${formatDate(to)}` });

  const valid = rows.filter((r) => r.status !== 'dibatalkan');
  const totalPenjualan = valid.reduce((sum, r) => sum + Number(r.total), 0);
  const rataRata = valid.length ? totalPenjualan / valid.length : 0;

  const tableY = drawSummaryBoxes(
    doc,
    [
      { label: 'Total Penjualan', value: formatCurrency(totalPenjualan), sub: `${valid.length} transaksi`, color: COLORS.brand },
      { label: 'Rata-rata / Transaksi', value: formatCurrency(rataRata), color: COLORS.blue },
      { label: 'Total Transaksi', value: String(rows.length), sub: 'termasuk dibatalkan', color: COLORS.dark },
    ],
    startY
  );

  autoTable(doc, {
    ...TABLE_THEME,
    startY: tableY,
    head: [['Invoice', 'Tanggal', 'Pelanggan', 'Total', 'Status']],
    body: rows.map((r) => [r.invoice_no, formatDateTime(r.created_at), r.customer || '-', formatCurrency(r.total), STATUS_LABELS[r.status] || r.status]),
    columnStyles: { 3: { halign: 'right' } },
  });

  drawFooter(doc, store.store_name);
  return doc;
}

export async function buildProfitReportPdf(rows, store, from, to) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const startY = await drawHeader(doc, { title: 'LAPORAN PROFIT', store, periodLabel: `${formatDate(from)} – ${formatDate(to)}` });

  const totalPenjualan = rows.reduce((sum, r) => sum + Number(r.total_penjualan), 0);
  const totalModal = rows.reduce((sum, r) => sum + Number(r.total_modal), 0);
  const totalProfit = rows.reduce((sum, r) => sum + Number(r.profit), 0);

  const tableY = drawSummaryBoxes(
    doc,
    [
      { label: 'Total Penjualan', value: formatCurrency(totalPenjualan), color: COLORS.blue },
      { label: 'Total Modal', value: formatCurrency(totalModal), color: COLORS.dark },
      { label: 'Total Profit', value: formatCurrency(totalProfit), sub: `${rows.length} produk/unit`, color: COLORS.emerald },
    ],
    startY
  );

  autoTable(doc, {
    ...TABLE_THEME,
    startY: tableY,
    head: [['Produk', 'SKU', 'Qty', 'Penjualan', 'Modal', 'Profit']],
    body: rows.map((r) => [r.product, r.sku, String(r.qty_terjual), formatCurrency(r.total_penjualan), formatCurrency(r.total_modal), formatCurrency(r.profit)]),
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold', textColor: COLORS.emerald } },
  });

  drawFooter(doc, store.store_name);
  return doc;
}

export async function buildStockReportPdf(rows, store) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const startY = await drawHeader(doc, { title: 'LAPORAN STOK', store, periodLabel: 'Posisi stok saat ini' });

  const totalNilaiStok = rows.reduce((sum, r) => sum + Number(r.nilai_stok), 0);
  const lowStockCount = rows.filter((r) => r.stock_qty <= r.min_stock).length;

  const tableY = drawSummaryBoxes(
    doc,
    [
      { label: 'Total Nilai Stok', value: formatCurrency(totalNilaiStok), color: COLORS.dark },
      { label: 'Jumlah Item', value: String(rows.length), color: COLORS.blue },
      { label: 'Stok Menipis', value: String(lowStockCount), sub: 'item di bawah/sama minimum', color: COLORS.red },
    ],
    startY
  );

  autoTable(doc, {
    ...TABLE_THEME,
    startY: tableY,
    head: [['Item', 'SKU', 'Kategori', 'Stok', 'Nilai Stok']],
    body: rows.map((r) => [r.name, r.sku, r.category, String(r.stock_qty), formatCurrency(r.nilai_stok)]),
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
    didParseCell(data) {
      if (data.section === 'body' && rows[data.row.index]?.stock_qty <= rows[data.row.index]?.min_stock) {
        data.cell.styles.fillColor = [254, 242, 242];
        if (data.column.index === 3) data.cell.styles.textColor = COLORS.red;
      }
    },
  });

  drawFooter(doc, store.store_name);
  return doc;
}

export async function buildServiceReportPdf(rows, store, from, to) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const startY = await drawHeader(doc, { title: 'LAPORAN SERVICE', store, periodLabel: `${formatDate(from)} – ${formatDate(to)}` });

  const selesai = rows.filter((r) => ['selesai', 'diambil'].includes(r.status));
  const totalBiaya = selesai.reduce((sum, r) => sum + Number(r.final_cost || 0), 0);

  const tableY = drawSummaryBoxes(
    doc,
    [
      { label: 'Total Tiket', value: String(rows.length), color: COLORS.dark },
      { label: 'Selesai / Diambil', value: String(selesai.length), color: COLORS.emerald },
      { label: 'Total Biaya Akhir', value: formatCurrency(totalBiaya), color: COLORS.brand },
    ],
    startY
  );

  autoTable(doc, {
    ...TABLE_THEME,
    startY: tableY,
    head: [['Tiket', 'Pelanggan', 'Perangkat', 'Status', 'Biaya Akhir']],
    body: rows.map((r) => [r.ticket_no, r.customer || '-', r.device_model, STATUS_LABELS[r.status] || r.status, formatCurrency(r.final_cost)]),
    columnStyles: { 4: { halign: 'right' } },
  });

  drawFooter(doc, store.store_name);
  return doc;
}

function isOverdueDebt(d) {
  return d.status === 'belum_lunas' && d.due_date && new Date(d.due_date) < new Date(new Date().toDateString());
}

export async function buildDebtsReportPdf(rows, store) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const startY = await drawHeader(doc, { title: 'LAPORAN HUTANG PIUTANG', store, periodLabel: 'Ringkasan saat ini' });

  const unpaid = rows.filter((d) => d.status === 'belum_lunas');
  const paid = rows.filter((d) => d.status === 'lunas');
  const totalUnpaid = unpaid.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalPaid = paid.reduce((sum, d) => sum + Number(d.amount), 0);
  const overdueCount = rows.filter(isOverdueDebt).length;

  const tableY = drawSummaryBoxes(
    doc,
    [
      { label: 'Belum Lunas', value: formatCurrency(totalUnpaid), sub: `${unpaid.length} hutang${overdueCount ? ` · ${overdueCount} lewat tempo` : ''}`, color: COLORS.red },
      { label: 'Lunas', value: formatCurrency(totalPaid), sub: `${paid.length} hutang`, color: COLORS.emerald },
      { label: 'Total Keseluruhan', value: formatCurrency(totalUnpaid + totalPaid), sub: `${rows.length} transaksi`, color: COLORS.dark },
    ],
    startY
  );

  autoTable(doc, {
    ...TABLE_THEME,
    startY: tableY,
    head: [['Supplier', 'Kode', 'Keterangan', 'Nominal', 'Jatuh Tempo', 'Status']],
    body: rows.map((d) => [
      d.supplier,
      d.supplier_code,
      d.description || '-',
      formatCurrency(d.amount),
      d.due_date ? formatDate(d.due_date) + (isOverdueDebt(d) ? ' (lewat tempo)' : '') : '-',
      d.status === 'lunas' ? 'Lunas' : 'Belum Lunas',
    ]),
    columnStyles: { 3: { halign: 'right' } },
    didParseCell(data) {
      if (data.section === 'body' && isOverdueDebt(rows[data.row.index])) {
        data.cell.styles.fillColor = [254, 242, 242];
      }
    },
  });

  drawFooter(doc, store.store_name);
  return doc;
}

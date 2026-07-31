export function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
}

export function formatDate(value, opts = {}) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', ...opts }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function formatTimeAgo(value) {
  if (!value) return '-';
  const diffSec = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return formatDate(value);
}

export const STATUS_LABELS = {
  lunas: 'Lunas',
  belum_lunas: 'Belum Lunas',
  dibatalkan: 'Dibatalkan',
  menunggu_pengecekan: 'Menunggu Pengecekan',
  sedang_dikerjakan: 'Sedang Dikerjakan',
  menunggu_sparepart: 'Menunggu Sparepart',
  selesai: 'Selesai',
  diambil: 'Sudah Diambil',
};

export const PAYMENT_METHOD_LABELS = {
  tunai: 'Tunai',
  transfer: 'Transfer Bank',
  qris: 'QRIS', // legacy value — kept so older transactions still display correctly
  qris_bca: 'QRIS BCA',
  qris_bri: 'QRIS BRI',
  kartu: 'Kartu Debit/Kredit',
};

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  kasir: 'Kasir',
  teknisi: 'Teknisi',
};

export const KONDISI_FISIK_OPTIONS = [
  { value: 'baik', label: 'Baik' },
  { value: 'rusak', label: 'Rusak' },
  { value: 'tidak_dicek', label: 'Tidak Dicek' },
];

export const KELENGKAPAN_OPTIONS = [
  { value: 'ada', label: 'Ada' },
  { value: 'tidak_ada', label: 'Tidak Ada' },
];

export const CHECKLIST_STATUS_LABELS = {
  baik: 'Baik',
  rusak: 'Rusak',
  tidak_dicek: 'Tidak Dicek',
  ada: 'Ada',
  tidak_ada: 'Tidak Ada',
};

export const CHECKLIST_STATUS_STYLES = {
  baik: 'text-emerald-600',
  ada: 'text-emerald-600',
  rusak: 'text-red-500',
  tidak_dicek: 'text-amber-500',
  tidak_ada: 'text-neutral-400',
};

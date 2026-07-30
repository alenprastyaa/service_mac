<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { Download, FileText } from 'lucide-vue-next';
import api from '../lib/api';
import EmptyState from '../components/EmptyState.vue';
import StatusBadge from '../components/StatusBadge.vue';
import Modal from '../components/Modal.vue';
import LaporanPenjualanPdf from '../components/LaporanPenjualanPdf.vue';
import LaporanProfitPdf from '../components/LaporanProfitPdf.vue';
import LaporanStokPdf from '../components/LaporanStokPdf.vue';
import LaporanServicePdf from '../components/LaporanServicePdf.vue';
import LaporanHutangPiutangPdf from '../components/LaporanHutangPiutangPdf.vue';
import { downloadElementAsPaginatedA4Pdf } from '../lib/pdf';
import { useStoreSettingsStore } from '../stores/storeSettings';
import { formatCurrency, formatDateTime, formatDate } from '../lib/format';

const TABS = [
  { value: 'sales', label: 'Penjualan' },
  { value: 'profit', label: 'Profit' },
  { value: 'stock', label: 'Stok' },
  { value: 'service', label: 'Service' },
  { value: 'hutang-piutang', label: 'Hutang Piutang' },
];
const NO_DATE_RANGE_TABS = ['stock', 'hutang-piutang'];
const PDF_META = {
  sales: { title: 'Laporan Penjualan', component: LaporanPenjualanPdf, filename: 'Laporan-Penjualan' },
  profit: { title: 'Laporan Profit', component: LaporanProfitPdf, filename: 'Laporan-Profit' },
  stock: { title: 'Laporan Stok', component: LaporanStokPdf, filename: 'Laporan-Stok' },
  service: { title: 'Laporan Service', component: LaporanServicePdf, filename: 'Laporan-Service' },
  'hutang-piutang': { title: 'Laporan Hutang Piutang', component: LaporanHutangPiutangPdf, filename: 'Laporan-Hutang-Piutang' },
};

const storeSettings = useStoreSettingsStore();
const tab = ref('sales');
const from = ref(defaultFrom());
const to = ref(new Date().toISOString().slice(0, 10));
const rows = ref([]);
const loading = ref(true);

function defaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}

function isOverdue(d) {
  return d.status === 'belum_lunas' && d.due_date && new Date(d.due_date) < new Date(new Date().toDateString());
}

async function load() {
  loading.value = true;
  const { data } = await api.get(`/reports/${tab.value}`, { params: { from: from.value, to: to.value } });
  rows.value = data;
  loading.value = false;
}

async function exportCsv() {
  const { data } = await api.get(`/reports/${tab.value}`, { params: { from: from.value, to: to.value, format: 'csv' }, responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([data], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan-${tab.value}-${from.value}_${to.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Modern PDF report — one printable design per tab, picked via PDF_META
const showPdfPreview = ref(false);
const pdfRef = ref(null);
const pdfDownloading = ref(false);

async function openPdfPreview() {
  await storeSettings.fetch();
  showPdfPreview.value = true;
}

async function downloadPdf() {
  pdfDownloading.value = true;
  try {
    await nextTick();
    await downloadElementAsPaginatedA4Pdf(pdfRef.value.$el, `${PDF_META[tab.value].filename}-${to.value}.pdf`);
  } finally {
    pdfDownloading.value = false;
  }
}

watch([tab, from, to], load);
onMounted(load);
</script>

<template>
  <div class="pt-2">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Laporan</h1>
        <p class="text-sm text-neutral-500">Analisis penjualan, profit, stok, dan service.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-primary" @click="openPdfPreview"><FileText :size="16" /> Generate Laporan PDF</button>
        <button class="btn-secondary" @click="exportCsv"><Download :size="16" /> Export CSV</button>
      </div>
    </div>

    <div class="card p-4 mb-4 flex flex-wrap items-center gap-3">
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="t in TABS"
          :key="t.value"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          :class="tab === t.value ? 'bg-brand-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'"
          @click="tab = t.value"
        >
          {{ t.label }}
        </button>
      </div>
      <div v-if="!NO_DATE_RANGE_TABS.includes(tab)" class="flex items-center gap-2 ml-auto text-sm">
        <input v-model="from" type="date" class="input w-auto" />
        <span class="text-neutral-400">s/d</span>
        <input v-model="to" type="date" class="input w-auto" />
      </div>
    </div>

    <div class="card p-5">
      <EmptyState v-if="!loading && !rows.length" message="Tidak ada data untuk periode ini." />

      <div v-else-if="tab === 'sales'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Invoice</th>
              <th class="px-2 py-2 font-medium">Tanggal</th>
              <th class="px-2 py-2 font-medium">Pelanggan</th>
              <th class="px-2 py-2 font-medium text-right">Total</th>
              <th class="px-2 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.invoice_no" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-2.5 font-medium">{{ r.invoice_no }}</td>
              <td class="px-2 py-2.5 text-neutral-500">{{ formatDateTime(r.created_at) }}</td>
              <td class="px-2 py-2.5 text-neutral-500">{{ r.customer || '-' }}</td>
              <td class="px-2 py-2.5 text-right font-medium">{{ formatCurrency(r.total) }}</td>
              <td class="px-2 py-2.5"><StatusBadge :status="r.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="tab === 'profit'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Produk</th>
              <th class="px-2 py-2 font-medium text-right">Qty Terjual</th>
              <th class="px-2 py-2 font-medium text-right">Total Penjualan</th>
              <th class="px-2 py-2 font-medium text-right">Modal</th>
              <th class="px-2 py-2 font-medium text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.sku" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-2.5 font-medium">{{ r.product }}</td>
              <td class="px-2 py-2.5 text-right">{{ r.qty_terjual }}</td>
              <td class="px-2 py-2.5 text-right">{{ formatCurrency(r.total_penjualan) }}</td>
              <td class="px-2 py-2.5 text-right text-neutral-500">{{ formatCurrency(r.total_modal) }}</td>
              <td class="px-2 py-2.5 text-right font-medium text-emerald-600">{{ formatCurrency(r.profit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="tab === 'stock'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">SKU</th>
              <th class="px-2 py-2 font-medium">Produk</th>
              <th class="px-2 py-2 font-medium">Kategori</th>
              <th class="px-2 py-2 font-medium text-right">Stok</th>
              <th class="px-2 py-2 font-medium text-right">Nilai Stok</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.sku" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-2.5 text-neutral-500">{{ r.sku }}</td>
              <td class="px-2 py-2.5 font-medium">{{ r.name }}</td>
              <td class="px-2 py-2.5 text-neutral-500">{{ r.category }}</td>
              <td class="px-2 py-2.5 text-right" :class="r.stock_qty <= r.min_stock ? 'text-red-500 font-semibold' : ''">{{ r.stock_qty }}</td>
              <td class="px-2 py-2.5 text-right font-medium">{{ formatCurrency(r.nilai_stok) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="tab === 'service'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Tiket</th>
              <th class="px-2 py-2 font-medium">Pelanggan</th>
              <th class="px-2 py-2 font-medium">Perangkat</th>
              <th class="px-2 py-2 font-medium">Teknisi</th>
              <th class="px-2 py-2 font-medium">Status</th>
              <th class="px-2 py-2 font-medium text-right">Biaya Akhir</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.ticket_no" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-2.5 font-medium">{{ r.ticket_no }}</td>
              <td class="px-2 py-2.5 text-neutral-500">{{ r.customer || '-' }}</td>
              <td class="px-2 py-2.5 text-neutral-500">{{ r.device_model }}</td>
              <td class="px-2 py-2.5 text-neutral-500">{{ r.technician || '-' }}</td>
              <td class="px-2 py-2.5"><StatusBadge :status="r.status" /></td>
              <td class="px-2 py-2.5 text-right font-medium">{{ formatCurrency(r.final_cost) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="tab === 'hutang-piutang'" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Supplier</th>
              <th class="px-2 py-2 font-medium">Keterangan</th>
              <th class="px-2 py-2 font-medium text-right">Nominal</th>
              <th class="px-2 py-2 font-medium">Jatuh Tempo</th>
              <th class="px-2 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id" class="border-t border-neutral-100 dark:border-neutral-800" :class="isOverdue(r) && 'bg-red-50/50 dark:bg-red-950/20'">
              <td class="px-2 py-2.5">
                <p class="font-medium">{{ r.supplier }}</p>
                <p class="text-xs text-neutral-400">{{ r.supplier_code }}</p>
              </td>
              <td class="px-2 py-2.5 text-neutral-500">{{ r.description || '-' }}</td>
              <td class="px-2 py-2.5 text-right font-medium">{{ formatCurrency(r.amount) }}</td>
              <td class="px-2 py-2.5 text-neutral-500">
                {{ r.due_date ? formatDate(r.due_date) : '-' }}
                <span v-if="isOverdue(r)" class="block text-xs text-red-500 font-medium">Lewat jatuh tempo</span>
              </td>
              <td class="px-2 py-2.5">
                <span class="badge font-medium" :class="r.status === 'lunas' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
                  {{ r.status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showPdfPreview" :title="PDF_META[tab].title" size="xl" @close="showPdfPreview = false">
      <div class="space-y-4">
        <component :is="PDF_META[tab].component" ref="pdfRef" :rows="rows" :store="storeSettings.data || {}" :from="from" :to="to" />
        <div class="flex justify-end gap-2">
          <button class="btn-secondary" @click="showPdfPreview = false">Tutup</button>
          <button class="btn-primary" :disabled="pdfDownloading" @click="downloadPdf">
            <Download :size="16" /> {{ pdfDownloading ? 'Membuat PDF...' : 'Download PDF' }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

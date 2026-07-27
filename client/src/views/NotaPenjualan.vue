<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  ArrowLeft, Download, Printer, MessageCircle, Receipt, FileText, Smartphone,
  MapPin, Phone, Instagram, User, CreditCard, CheckCircle2, QrCode,
} from 'lucide-vue-next';
import api from '../lib/api';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS, STATUS_LABELS, ROLE_LABELS } from '../lib/format';
import logo from '../assets/logo.png';

const route = useRoute();
const router = useRouter();

const sale = ref(null);
const store = ref(null);
const loading = ref(true);
const activeTab = ref('thermal');
const notaRef = ref(null);
const qrDataUrl = ref('');
const downloading = ref(false);
const downloadError = ref('');

const TABS = [
  { key: 'thermal', label: 'Nota Thermal 80mm', icon: Receipt },
  { key: 'a4', label: 'Invoice A4 / PDF', icon: FileText },
  { key: 'digital', label: 'Nota Digital (WhatsApp)', icon: Smartphone },
];

const saleDate = computed(() => (sale.value ? formatDate(sale.value.created_at) : '-'));
const saleTime = computed(() => {
  if (!sale.value?.created_at) return '-';
  return `${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(sale.value.created_at))} WIB`;
});
const paymentLabel = computed(() => PAYMENT_METHOD_LABELS[sale.value?.payment_method] || sale.value?.payment_method || '-');
const statusLabel = computed(() => STATUS_LABELS[sale.value?.status] || sale.value?.status || '-');

async function load() {
  loading.value = true;
  const [saleRes, storeRes] = await Promise.all([api.get(`/sales/${route.params.id}`), api.get('/settings/store')]);
  sale.value = saleRes.data;
  store.value = storeRes.data;

  const qrTarget = store.value.website || (store.value.instagram ? `https://instagram.com/${store.value.instagram.replace(/^@/, '')}` : '');
  if (qrTarget) {
    qrDataUrl.value = await QRCode.toDataURL(qrTarget, { width: 160, margin: 1, color: { dark: '#171717', light: '#ffffff' } });
  }
  loading.value = false;
}

// Renders the on-screen invoice to an image and lays it into an A4 PDF, matching
// the exact on-screen design instead of relying on browser print CSS.
async function downloadPdf() {
  downloading.value = true;
  downloadError.value = '';
  try {
    await nextTick();
    const canvas = await html2canvas(notaRef.value, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Invoice-${sale.value.invoice_no}.pdf`);
  } catch (err) {
    downloadError.value = 'Gagal membuat PDF, silakan coba lagi.';
  } finally {
    downloading.value = false;
  }
}

function printNota() {
  window.print();
}

// Normalizes an Indonesian phone number (leading 0 or +62) into the 62xxxx
// format wa.me expects.
const waPhone = computed(() => {
  const digits = (sale.value?.customer_phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
});

const waMessage = computed(() => {
  if (!sale.value || !store.value) return '';
  const lines = [`*${store.value.store_name || 'Oren MacStore'}*`];
  if (store.value.tagline) lines.push(`_${store.value.tagline}_`);
  lines.push('', `*${sale.value.invoice_no}*`, `${saleDate.value} • ${saleTime.value}`, '');

  sale.value.items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.product_name}`);
    lines.push(`    ${it.qty} x ${formatCurrency(it.price)} = ${formatCurrency(it.subtotal)}`);
  });

  lines.push('', `Subtotal: ${formatCurrency(sale.value.subtotal)}`);
  if (Number(sale.value.discount) > 0) lines.push(`Diskon: -${formatCurrency(sale.value.discount)}`);
  if (Number(sale.value.tax) > 0) lines.push(`Pajak: ${formatCurrency(sale.value.tax)}`);
  lines.push(`*TOTAL: ${formatCurrency(sale.value.total)}*`, '');
  lines.push(`Pembayaran: ${paymentLabel.value} (${statusLabel.value})`, '');
  lines.push('Terima kasih atas kepercayaan Anda 🙏');
  return lines.join('\n');
});

function sendWhatsApp() {
  const text = encodeURIComponent(waMessage.value);
  const url = `https://wa.me/${waPhone.value}?text=${text}`;
  window.open(url, '_blank');
}

onMounted(load);
</script>

<template>
  <div class="pt-2 pb-10">
    <div class="no-print flex flex-wrap items-center justify-between gap-3 mb-4 max-w-[820px] mx-auto">
      <button class="btn-secondary" @click="router.back()"><ArrowLeft :size="16" /> Kembali</button>

      <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
        <button
          v-for="tab in TABS"
          :key="tab.key"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          :class="activeTab === tab.key ? 'bg-white dark:bg-neutral-900 shadow-card text-brand-600' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
          @click="activeTab = tab.key"
        >
          <component :is="tab.icon" :size="14" /> {{ tab.label }}
        </button>
      </div>

      <button v-if="activeTab === 'thermal'" class="btn-primary" :disabled="loading" @click="printNota"><Printer :size="16" /> Cetak Struk</button>
      <button v-else-if="activeTab === 'a4'" class="btn-primary" :disabled="loading || downloading" @click="downloadPdf">
        <Download :size="16" /> {{ downloading ? 'Membuat PDF...' : 'Download PDF' }}
      </button>
      <button v-else class="btn-primary" :disabled="loading || !waPhone" @click="sendWhatsApp">
        <MessageCircle :size="16" /> Kirim via WhatsApp
      </button>
    </div>
    <p v-if="downloadError" class="no-print text-sm text-red-500 text-center max-w-[820px] mx-auto mb-3">{{ downloadError }}</p>
    <p v-if="activeTab === 'digital' && !waPhone && !loading" class="no-print text-sm text-amber-600 text-center max-w-[820px] mx-auto mb-3">
      Nomor WhatsApp pelanggan tidak tersedia untuk transaksi ini.
    </p>

    <div v-if="loading" class="text-center py-20 text-sm text-neutral-400">Memuat nota...</div>

    <template v-else>
      <!-- 1. Nota Thermal 80mm -->
      <div v-if="activeTab === 'thermal'" class="thermal-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-5 text-neutral-900 text-sm">
        <div class="flex items-center justify-center gap-2 pb-2">
          <img :src="logo" alt="logo" class="w-10 h-10 rounded-xl object-contain shrink-0" />
          <div class="text-left leading-tight">
            <p class="text-lg font-extrabold text-brand-500">{{ store.store_name }}</p>
            <p class="text-[10px] tracking-[0.25em] text-neutral-400 font-semibold">SOLO</p>
          </div>
        </div>
        <p class="text-center text-xs text-neutral-500 pb-3">{{ store.tagline }}</p>
        <div class="text-center text-[11px] text-neutral-500 space-y-0.5 pb-3">
          <p v-if="store.address">{{ store.address }}</p>
          <p v-if="store.phone">{{ store.phone }}</p>
          <p v-if="store.instagram">{{ store.instagram }}</p>
        </div>

        <div class="border-t border-dashed border-neutral-300 my-2"></div>
        <div class="text-xs space-y-1">
          <div class="flex"><span class="w-16 text-neutral-500 shrink-0">No. Nota</span><span>: {{ sale.invoice_no }}</span></div>
          <div class="flex"><span class="w-16 text-neutral-500 shrink-0">Tanggal</span><span>: {{ saleDate }}</span></div>
          <div class="flex"><span class="w-16 text-neutral-500 shrink-0">Kasir</span><span>: {{ sale.created_by_name || '-' }}</span></div>
        </div>
        <div class="border-t border-dashed border-neutral-300 my-3"></div>

        <table class="w-full text-[11px]">
          <thead>
            <tr class="text-neutral-400">
              <th class="text-left font-medium pb-1.5">Produk / Service</th>
              <th class="text-center font-medium pb-1.5">Qty</th>
              <th class="text-right font-medium pb-1.5">Harga</th>
              <th class="text-right font-medium pb-1.5">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in sale.items" :key="it.id">
              <td class="py-1 align-top">{{ it.product_name }}</td>
              <td class="py-1 text-center align-top">{{ it.qty }}</td>
              <td class="py-1 text-right align-top">{{ formatCurrency(it.price) }}</td>
              <td class="py-1 text-right align-top">{{ formatCurrency(it.subtotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="border-t border-dashed border-neutral-300 my-3"></div>
        <div class="text-xs space-y-1">
          <div class="flex justify-between"><span>Subtotal</span><span>{{ formatCurrency(sale.subtotal) }}</span></div>
          <div v-if="Number(sale.discount) > 0" class="flex justify-between"><span>Diskon</span><span>-{{ formatCurrency(sale.discount) }}</span></div>
          <div v-if="Number(sale.tax) > 0" class="flex justify-between"><span>Pajak</span><span>{{ formatCurrency(sale.tax) }}</span></div>
        </div>
        <div class="border-t border-neutral-300 my-2"></div>
        <div class="flex justify-between items-baseline font-bold">
          <span>TOTAL</span><span class="text-lg">{{ formatCurrency(sale.total) }}</span>
        </div>

        <div class="mt-4">
          <p class="text-[11px] text-neutral-500 mb-1.5">Metode Pembayaran :</p>
          <div class="flex items-center justify-between border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium">
            <span class="flex items-center gap-2"><QrCode :size="14" /> {{ paymentLabel }}</span>
            <CheckCircle2 :size="15" class="text-emerald-500" />
          </div>
        </div>

        <div class="text-center mt-5 pt-3 border-t border-dashed border-neutral-300">
          <p class="italic text-neutral-600">Terima kasih</p>
          <p class="text-[11px] text-neutral-500 mt-0.5">atas kepercayaan Anda ❤️</p>
        </div>
      </div>

      <!-- 2. Invoice A4 / PDF -->
      <div v-else-if="activeTab === 'a4'" ref="notaRef" class="nota-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-8 text-neutral-900">
        <div class="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-neutral-200">
          <div class="flex items-center gap-3">
            <img :src="logo" alt="logo" class="h-14 w-14 object-contain" />
            <div>
              <p class="text-xl font-extrabold text-brand-500 leading-tight">{{ store.store_name }}</p>
              <p class="text-[10px] tracking-[0.25em] text-neutral-400 font-semibold">SOLO</p>
              <p class="text-xs text-neutral-500 mt-1">{{ store.tagline }}</p>
            </div>
          </div>
          <div class="text-right">
            <h1 class="text-2xl font-bold text-neutral-800">INVOICE</h1>
            <span class="badge bg-brand-50 text-brand-600 font-semibold mt-2">{{ sale.invoice_no }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-start justify-between gap-4 py-4 border-b border-neutral-200">
          <div class="text-xs text-neutral-500 space-y-1.5">
            <p v-if="store.address" class="flex items-center gap-1.5"><MapPin :size="13" /> {{ store.address }}</p>
            <p v-if="store.phone" class="flex items-center gap-1.5"><Phone :size="13" /> {{ store.phone }}</p>
            <p v-if="store.instagram" class="flex items-center gap-1.5"><Instagram :size="13" /> {{ store.instagram }}</p>
          </div>
          <dl class="text-xs space-y-1 text-right">
            <div><dt class="inline text-neutral-500">Tanggal : </dt><dd class="inline font-medium">{{ saleDate }}</dd></div>
            <div><dt class="inline text-neutral-500">Waktu : </dt><dd class="inline font-medium">{{ saleTime }}</dd></div>
            <div><dt class="inline text-neutral-500">Kasir : </dt><dd class="inline font-medium">{{ sale.created_by_name || '-' }}</dd></div>
          </dl>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div class="rounded-xl border border-neutral-200 p-4 flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0"><User :size="16" class="text-neutral-500" /></div>
            <div class="text-sm">
              <p class="text-xs font-semibold text-neutral-500 mb-0.5">Pelanggan</p>
              <p class="font-medium">{{ sale.customer_name || 'Tanpa nama pelanggan' }}</p>
              <p class="text-xs text-neutral-500">{{ sale.customer_phone || '-' }}</p>
            </div>
          </div>
          <div class="rounded-xl border border-neutral-200 p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0"><CreditCard :size="16" class="text-neutral-500" /></div>
              <div class="text-sm">
                <p class="text-xs font-semibold text-neutral-500 mb-0.5">Metode Pembayaran</p>
                <p class="font-medium">{{ paymentLabel }}</p>
              </div>
            </div>
            <span class="badge" :class="sale.status === 'lunas' ? 'bg-emerald-50 text-emerald-600' : sale.status === 'belum_lunas' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'">
              {{ statusLabel }}
            </span>
          </div>
        </div>

        <table class="w-full text-sm mt-5 rounded-xl overflow-hidden">
          <thead>
            <tr class="bg-brand-500 text-white text-xs uppercase">
              <th class="px-3 py-2.5 text-left font-medium w-10">No.</th>
              <th class="px-3 py-2.5 text-left font-medium">Produk / Service</th>
              <th class="px-3 py-2.5 text-right font-medium">Qty</th>
              <th class="px-3 py-2.5 text-right font-medium">Harga</th>
              <th class="px-3 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, i) in sale.items" :key="it.id" class="border-b border-neutral-100 last:border-0">
              <td class="px-3 py-3 text-neutral-500">{{ i + 1 }}</td>
              <td class="px-3 py-3">
                <p class="font-medium">{{ it.product_name }}</p>
                <p class="text-xs text-neutral-400">{{ it.sku }}</p>
              </td>
              <td class="px-3 py-3 text-right">{{ it.qty }}</td>
              <td class="px-3 py-3 text-right">{{ formatCurrency(it.price) }}</td>
              <td class="px-3 py-3 text-right font-medium">{{ formatCurrency(it.subtotal) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="flex flex-wrap items-end justify-between gap-6 mt-6">
          <div v-if="qrDataUrl" class="flex items-center gap-3">
            <img :src="qrDataUrl" alt="QR" class="w-20 h-20 rounded-lg border border-neutral-200" />
            <div class="text-xs text-neutral-500 max-w-[150px]">
              <p class="font-semibold text-neutral-700 mb-0.5">Terima kasih atas kepercayaan Anda!</p>
              <p>Scan untuk kunjungi kami.</p>
            </div>
          </div>
          <div class="w-full sm:w-64 space-y-1.5 text-sm ml-auto">
            <div class="flex justify-between text-neutral-500"><span>Subtotal</span><span>{{ formatCurrency(sale.subtotal) }}</span></div>
            <div v-if="Number(sale.discount) > 0" class="flex justify-between text-orange-500"><span>Diskon</span><span>- {{ formatCurrency(sale.discount) }}</span></div>
            <div v-if="Number(sale.tax) > 0" class="flex justify-between text-neutral-500"><span>Pajak</span><span>{{ formatCurrency(sale.tax) }}</span></div>
            <div class="flex justify-between font-bold text-base border-t border-neutral-200 pt-2 mt-1"><span>TOTAL</span><span>{{ formatCurrency(sale.total) }}</span></div>
          </div>
        </div>

        <div class="flex justify-end mt-10">
          <div class="text-center text-sm">
            <p class="text-neutral-500 mb-10">Hormat kami,<br /><span class="font-medium text-neutral-700">{{ store.store_name }}</span></p>
            <p class="border-t border-neutral-300 pt-1 font-medium">{{ sale.created_by_name || '-' }}</p>
            <p class="text-neutral-400 text-xs">{{ ROLE_LABELS[sale.created_by_role] || '-' }}</p>
          </div>
        </div>
      </div>

      <!-- 3. Nota Digital (WhatsApp) -->
      <div v-else class="max-w-sm mx-auto">
        <div class="rounded-3xl overflow-hidden shadow-card border border-neutral-100 bg-[#e5ddd5] dark:bg-neutral-800">
          <div class="bg-emerald-600 text-white flex items-center gap-3 px-4 py-3">
            <img :src="logo" alt="logo" class="w-8 h-8 rounded-full object-contain bg-white p-0.5" />
            <div class="text-sm">
              <p class="font-semibold leading-tight">{{ store.store_name }}</p>
              <p class="text-[11px] text-emerald-100">online</p>
            </div>
          </div>
          <div class="p-4">
            <div class="bg-white rounded-xl p-4 text-sm shadow">
              <p class="text-center font-bold text-brand-500 mb-0.5">{{ store.store_name }}</p>
              <p class="text-center text-[10px] tracking-[0.25em] text-neutral-400 font-semibold mb-3">SOLO</p>
              <div class="flex justify-between text-xs text-neutral-500 border-b border-dashed border-neutral-200 pb-2 mb-2">
                <span class="font-medium text-neutral-700">{{ sale.invoice_no }}</span>
                <span>{{ saleDate }} • {{ saleTime }}</span>
              </div>
              <div class="space-y-2">
                <div v-for="it in sale.items" :key="it.id" class="flex justify-between text-xs">
                  <div>
                    <p class="text-neutral-700">{{ it.product_name }}</p>
                    <p class="text-neutral-400">{{ it.qty }} x {{ formatCurrency(it.price) }}</p>
                  </div>
                  <span class="font-medium">{{ formatCurrency(it.subtotal) }}</span>
                </div>
              </div>
              <div class="border-t border-dashed border-neutral-200 mt-3 pt-2 space-y-1 text-xs">
                <div class="flex justify-between text-neutral-500"><span>Subtotal</span><span>{{ formatCurrency(sale.subtotal) }}</span></div>
                <div v-if="Number(sale.discount) > 0" class="flex justify-between text-orange-500"><span>Diskon</span><span>- {{ formatCurrency(sale.discount) }}</span></div>
              </div>
              <div class="flex justify-between font-bold text-sm mt-2"><span>TOTAL</span><span>{{ formatCurrency(sale.total) }}</span></div>
              <div class="flex items-center justify-between mt-3 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                <span class="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 :size="13" /> Pembayaran: {{ paymentLabel }}</span>
                <span class="badge bg-emerald-100 text-emerald-700 text-[10px]">{{ statusLabel }}</span>
              </div>
            </div>
            <p class="text-xs text-neutral-500 mt-2 px-1">Terima kasih atas kepercayaan Anda 🙏</p>
          </div>
        </div>
        <p class="no-print text-xs text-neutral-400 text-center mt-4">
          Klik "Kirim via WhatsApp" untuk membuka chat pelanggan dengan pesan nota siap kirim.
        </p>
      </div>
    </template>
  </div>
</template>

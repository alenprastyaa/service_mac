<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Download, MessageCircle, Receipt, FileText, Smartphone, CheckCircle2 } from 'lucide-vue-next';
import { formatCurrency, PAYMENT_METHOD_LABELS, STATUS_LABELS } from '../lib/format';
import { normalizeWaPhone, openSaleWhatsApp } from '../lib/whatsapp';
import { useSaleNota } from '../lib/useSaleNota';
import { downloadElementAsFittedPdf, downloadElementAsA4Pdf } from '../lib/pdf';
import NotaThermal from '../components/NotaThermal.vue';
import NotaInvoiceA4 from '../components/NotaInvoiceA4.vue';
import logo from '../assets/logo.png';

const route = useRoute();
const router = useRouter();

const { sale, store, qrDataUrl, loading, load } = useSaleNota();
const activeTab = ref('thermal');
const thermalRef = ref(null);
const a4Ref = ref(null);
const downloading = ref(false);
const downloadError = ref('');

const TABS = [
  { key: 'thermal', label: 'Nota Thermal 80mm', icon: Receipt },
  { key: 'a4', label: 'Invoice A4 / PDF', icon: FileText },
  { key: 'digital', label: 'Nota Digital (WhatsApp)', icon: Smartphone },
];

const saleDate = computed(() => (sale.value ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(sale.value.created_at)) : '-'));
const saleTime = computed(() => {
  if (!sale.value?.created_at) return '-';
  return `${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(sale.value.created_at))} WIB`;
});
const paymentLabel = computed(() => PAYMENT_METHOD_LABELS[sale.value?.payment_method] || sale.value?.payment_method || '-');
const statusLabel = computed(() => STATUS_LABELS[sale.value?.status] || sale.value?.status || '-');
const waPhone = computed(() => normalizeWaPhone(sale.value?.customer_phone));

async function downloadThermal() {
  downloading.value = true;
  downloadError.value = '';
  try {
    await nextTick();
    await downloadElementAsFittedPdf(thermalRef.value.$el, `Struk-${sale.value.invoice_no}.pdf`, 80);
  } catch (err) {
    downloadError.value = 'Gagal membuat struk, silakan coba lagi.';
  } finally {
    downloading.value = false;
  }
}

// Renders the on-screen invoice to an image and lays it into an A4 PDF, matching
// the exact on-screen design instead of relying on browser print CSS.
async function downloadPdf() {
  downloading.value = true;
  downloadError.value = '';
  try {
    await nextTick();
    await downloadElementAsA4Pdf(a4Ref.value.$el, `Invoice-${sale.value.invoice_no}.pdf`);
  } catch (err) {
    downloadError.value = 'Gagal membuat PDF, silakan coba lagi.';
  } finally {
    downloading.value = false;
  }
}

function sendWhatsApp() {
  openSaleWhatsApp(sale.value, store.value);
}

onMounted(() => load(route.params.id));
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

      <div class="flex items-center gap-2">
        <button v-if="activeTab === 'thermal'" class="btn-secondary" :disabled="loading || downloading" @click="downloadThermal">
          <Download :size="16" /> {{ downloading ? 'Membuat...' : 'Download Struk' }}
        </button>
        <button v-else-if="activeTab === 'a4'" class="btn-secondary" :disabled="loading || downloading" @click="downloadPdf">
          <Download :size="16" /> {{ downloading ? 'Membuat PDF...' : 'Download PDF' }}
        </button>
        <button class="btn-primary" :disabled="loading || !waPhone" :title="!waPhone ? 'Nomor WhatsApp pelanggan tidak tersedia' : ''" @click="sendWhatsApp">
          <MessageCircle :size="16" /> Kirim ke WhatsApp
        </button>
      </div>
    </div>
    <p v-if="downloadError" class="no-print text-sm text-red-500 text-center max-w-[820px] mx-auto mb-3">{{ downloadError }}</p>
    <p v-if="!waPhone && !loading" class="no-print text-sm text-amber-600 text-center max-w-[820px] mx-auto mb-3">
      Nomor WhatsApp pelanggan tidak tersedia untuk transaksi ini — lengkapi nomor HP di data pelanggan agar nota bisa dikirim langsung.
    </p>

    <div v-if="loading" class="text-center py-20 text-sm text-neutral-400">Memuat nota...</div>

    <template v-else>
      <NotaThermal v-if="activeTab === 'thermal'" ref="thermalRef" :sale="sale" :store="store" />
      <NotaInvoiceA4 v-else-if="activeTab === 'a4'" ref="a4Ref" :sale="sale" :store="store" :qr-data-url="qrDataUrl" />

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
              <div v-if="store.bank_account_number" class="mt-2 pt-2 border-t border-dashed border-neutral-200 text-xs">
                <p class="text-neutral-500">Transfer ke: <span class="font-medium text-neutral-700">{{ store.bank_name }} {{ store.bank_account_number }}</span> a.n. {{ store.bank_account_holder }}</p>
              </div>
            </div>
            <p class="text-xs text-neutral-500 mt-2 px-1">Terima kasih atas kepercayaan Anda 🙏</p>
          </div>
        </div>
        <p class="no-print text-xs text-neutral-400 text-center mt-4">
          Klik "Kirim ke WhatsApp" di atas untuk membuka chat pelanggan dengan pesan nota siap kirim.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ArrowLeft, Download, Printer, MessageCircle, Receipt, FileText, Smartphone, CheckCircle2 } from 'lucide-vue-next';
import { formatDate, STATUS_LABELS } from '../lib/format';
import { normalizeWaPhone, openServiceWhatsApp } from '../lib/whatsapp';
import { useServiceNota } from '../lib/useServiceNota';
import NotaServiceThermal from '../components/NotaServiceThermal.vue';
import NotaServiceA4 from '../components/NotaServiceA4.vue';
import logo from '../assets/logo.png';

const route = useRoute();
const router = useRouter();

const { service, store, qrDataUrl, checkUrl, loading, load } = useServiceNota();
const activeTab = ref('thermal');
const a4Ref = ref(null);
const isCapturing = ref(false);
const downloading = ref(false);
const downloadError = ref('');

const TABS = [
  { key: 'thermal', label: 'Nota Thermal 80mm', icon: Receipt },
  { key: 'a4', label: 'Nota Lengkap / PDF', icon: FileText },
  { key: 'digital', label: 'Nota Digital (WhatsApp)', icon: Smartphone },
];

const receivedDate = computed(() => (service.value ? formatDate(service.value.received_at) : '-'));
const statusLabel = computed(() => STATUS_LABELS[service.value?.status] || service.value?.status || '-');
const waPhone = computed(() => normalizeWaPhone(service.value?.customer_phone));

// Renders the on-screen nota to an image and lays it into an A4 PDF, matching
// the exact on-screen design instead of relying on browser print CSS.
async function downloadPdf() {
  downloading.value = true;
  downloadError.value = '';
  isCapturing.value = true;
  try {
    await nextTick();
    const canvas = await html2canvas(a4Ref.value.$el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
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

    pdf.save(`Nota-${service.value.ticket_no}.pdf`);
  } catch (err) {
    downloadError.value = 'Gagal membuat PDF, silakan coba lagi.';
  } finally {
    downloading.value = false;
    isCapturing.value = false;
  }
}

function printNota() {
  window.print();
}

function sendWhatsApp() {
  openServiceWhatsApp(service.value, store.value, checkUrl.value);
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
        <button v-if="activeTab === 'thermal'" class="btn-secondary" :disabled="loading" @click="printNota"><Printer :size="16" /> Cetak Struk</button>
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
      Nomor WhatsApp pelanggan tidak tersedia untuk tiket ini — lengkapi nomor HP di data pelanggan agar nota bisa dikirim langsung.
    </p>

    <div v-if="loading" class="text-center py-20 text-sm text-neutral-400">Memuat nota...</div>

    <template v-else>
      <NotaServiceThermal v-if="activeTab === 'thermal'" :service="service" :store="store" :qr-data-url="qrDataUrl" />
      <NotaServiceA4
        v-else-if="activeTab === 'a4'"
        ref="a4Ref"
        :service="service"
        :store="store"
        :qr-data-url="qrDataUrl"
        :check-url="checkUrl"
        :is-capturing="isCapturing"
      />

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
                <span class="font-medium text-neutral-700">{{ service.ticket_no }}</span>
                <span>{{ receivedDate }}</span>
              </div>
              <div class="text-xs space-y-1.5">
                <p class="font-medium text-neutral-700">{{ service.device_model }}</p>
                <p class="text-neutral-500">Keluhan: {{ service.complaint }}</p>
                <p class="text-neutral-500">Estimasi Pengecekan: {{ service.checkup_estimate }}</p>
              </div>
              <div class="flex items-center justify-between mt-3 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                <span class="flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 :size="13" /> Status</span>
                <span class="badge bg-emerald-100 text-emerald-700 text-[10px]">{{ statusLabel }}</span>
              </div>
              <p class="text-[11px] text-brand-500 mt-2 break-all">{{ checkUrl.replace('https://', '').replace('http://', '') }}</p>
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

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Download, MessageCircle, CheckCircle2 } from 'lucide-vue-next';
import Modal from './Modal.vue';
import NotaServiceThermal from './NotaServiceThermal.vue';
import NotaServiceA4 from './NotaServiceA4.vue';
import { normalizeWaPhone, openServiceWhatsApp } from '../lib/whatsapp';
import { useServiceNota } from '../lib/useServiceNota';
import { downloadElementAsFittedPdf, downloadElementAsA4Pdf } from '../lib/pdf';

const props = defineProps({ serviceId: { type: [Number, String], required: true } });
const emit = defineEmits(['close']);

const { service, store, qrDataUrl, checkUrl, loading, load } = useServiceNota();
const thermalRef = ref(null);
const a4Ref = ref(null);
const isCapturing = ref(false);
const downloading = ref(''); // '' | 'thermal' | 'a4'
const downloadError = ref('');

const waPhone = computed(() => normalizeWaPhone(service.value?.customer_phone));

async function downloadThermal() {
  downloading.value = 'thermal';
  downloadError.value = '';
  try {
    await downloadElementAsFittedPdf(thermalRef.value.$el, `Struk-${service.value.ticket_no}.pdf`, 80);
  } catch (err) {
    downloadError.value = 'Gagal membuat struk, silakan coba lagi.';
  } finally {
    downloading.value = '';
  }
}

async function downloadA4() {
  downloading.value = 'a4';
  downloadError.value = '';
  isCapturing.value = true;
  try {
    await downloadElementAsA4Pdf(a4Ref.value.$el, `Nota-${service.value.ticket_no}.pdf`);
  } catch (err) {
    downloadError.value = 'Gagal membuat PDF, silakan coba lagi.';
  } finally {
    downloading.value = '';
    isCapturing.value = false;
  }
}

function sendWhatsApp() {
  openServiceWhatsApp(service.value, store.value, checkUrl.value);
}

onMounted(() => load(props.serviceId));
</script>

<template>
  <Modal title="Tiket Berhasil Dibuat" size="sm" @close="emit('close')">
    <div v-if="loading" class="text-center py-8 text-sm text-neutral-400">Menyiapkan nota...</div>
    <div v-else class="space-y-4">
      <div class="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950 rounded-xl px-4 py-3">
        <CheckCircle2 :size="20" class="text-emerald-500 shrink-0" />
        <div class="min-w-0">
          <p class="font-semibold truncate">{{ service.ticket_no }}</p>
          <p class="text-xs text-neutral-500 truncate">{{ service.customer_name || 'Tanpa nama pelanggan' }} • {{ service.device_model }}</p>
        </div>
      </div>

      <p v-if="downloadError" class="text-sm text-red-500 text-center">{{ downloadError }}</p>
      <p v-if="!waPhone" class="text-xs text-amber-600 text-center">
        Nomor WhatsApp pelanggan tidak tersedia — lengkapi nomor HP di data pelanggan agar bisa kirim langsung.
      </p>

      <div class="grid grid-cols-2 gap-2">
        <button class="btn-secondary justify-center" :disabled="!!downloading" @click="downloadThermal">
          <Download :size="15" /> {{ downloading === 'thermal' ? 'Membuat...' : 'Download Struk' }}
        </button>
        <button class="btn-secondary justify-center" :disabled="!!downloading" @click="downloadA4">
          <Download :size="15" /> {{ downloading === 'a4' ? 'Membuat...' : 'Download PDF' }}
        </button>
      </div>
      <button class="btn-primary w-full justify-center" :disabled="!waPhone" @click="sendWhatsApp">
        <MessageCircle :size="15" /> Kirim ke WhatsApp
      </button>
      <button type="button" class="btn-secondary w-full justify-center" @click="emit('close')">Tutup</button>
    </div>

    <!-- Off-screen renders used only as PDF-capture sources — never shown to the user. -->
    <Teleport to="body">
      <div v-if="service && store" style="position: fixed; left: -9999px; top: 0;">
        <NotaServiceThermal ref="thermalRef" :service="service" :store="store" :qr-data-url="qrDataUrl" />
        <NotaServiceA4 ref="a4Ref" :service="service" :store="store" :qr-data-url="qrDataUrl" :check-url="checkUrl" :is-capturing="isCapturing" />
      </div>
    </Teleport>
  </Modal>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ScanLine, Camera, CameraOff, Search } from 'lucide-vue-next';
import Modal from './Modal.vue';

const props = defineProps({
  title: { type: String, default: 'Scan Barcode' },
  // (code: string) => Promise<boolean> — resolve true if found (modal closes itself),
  // false if not found (keeps modal open, shows an inline error).
  lookup: { type: Function, required: true },
});
const emit = defineEmits(['close']);

const readerId = `scan-reader-${Math.random().toString(36).slice(2)}`;
const code = ref('');
const inputRef = ref(null);
const searching = ref(false);
const notFound = ref(false);
const cameraOn = ref(false);
const cameraError = ref('');
let html5Qrcode = null;

onMounted(() => nextTick(() => inputRef.value?.focus()));
onBeforeUnmount(stopCamera);

async function submit() {
  const value = code.value.trim();
  if (!value || searching.value) return;
  searching.value = true;
  notFound.value = false;
  try {
    const found = await props.lookup(value);
    if (found) {
      emit('close');
    } else {
      notFound.value = true;
      code.value = '';
      await nextTick();
      inputRef.value?.focus();
    }
  } finally {
    searching.value = false;
  }
}

async function toggleCamera() {
  if (cameraOn.value) {
    await stopCamera();
    return;
  }
  cameraError.value = '';
  cameraOn.value = true;
  await nextTick();
  try {
    html5Qrcode = new Html5Qrcode(readerId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.EAN_13],
      verbose: false,
    });
    await html5Qrcode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      async (decodedText) => {
        code.value = decodedText;
        await stopCamera();
        submit();
      },
      () => {}
    );
  } catch (err) {
    cameraError.value = 'Gagal membuka kamera. Pastikan izin kamera diberikan.';
    cameraOn.value = false;
  }
}

async function stopCamera() {
  if (html5Qrcode) {
    try {
      await html5Qrcode.stop();
      html5Qrcode.clear();
    } catch (err) {
      // camera already stopped / never started — safe to ignore
    }
    html5Qrcode = null;
  }
  cameraOn.value = false;
}
</script>

<template>
  <Modal :title="title" size="sm" @close="$emit('close')">
    <div class="space-y-4">
      <form @submit.prevent="submit" class="space-y-2">
        <label class="label">Scan pakai alat scanner, atau ketik manual</label>
        <div class="relative">
          <ScanLine :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            ref="inputRef"
            v-model="code"
            class="input !pl-10"
            placeholder="Arahkan scanner ke sini..."
            autocomplete="off"
            :disabled="searching"
          />
        </div>
        <button type="submit" class="btn-primary w-full" :disabled="searching || !code.trim()">
          <Search :size="15" /> {{ searching ? 'Mencari...' : 'Cari' }}
        </button>
      </form>

      <p v-if="notFound" class="text-sm text-red-500">Kode tidak ditemukan.</p>

      <div class="flex items-center gap-2">
        <div class="h-px flex-1 bg-neutral-100 dark:bg-neutral-800"></div>
        <span class="text-xs text-neutral-400">atau</span>
        <div class="h-px flex-1 bg-neutral-100 dark:bg-neutral-800"></div>
      </div>

      <button type="button" class="btn-secondary w-full" @click="toggleCamera">
        <component :is="cameraOn ? CameraOff : Camera" :size="15" /> {{ cameraOn ? 'Tutup Kamera' : 'Gunakan Kamera' }}
      </button>
      <p v-if="cameraError" class="text-sm text-red-500">{{ cameraError }}</p>
      <div v-show="cameraOn" :id="readerId" class="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800"></div>
    </div>
  </Modal>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import JsBarcode from 'jsbarcode';
import { Download } from 'lucide-vue-next';
import Modal from './Modal.vue';
import { downloadElementAsFittedPdf } from '../lib/pdf';

const props = defineProps({
  code: { type: String, required: true },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
});
defineEmits(['close']);

const svgRef = ref(null);
const labelRef = ref(null);
const downloading = ref(false);
const downloadError = ref('');

function render() {
  if (!svgRef.value) return;
  JsBarcode(svgRef.value, props.code, {
    format: 'CODE128',
    displayValue: true,
    fontSize: 14,
    height: 60,
    margin: 10,
  });
}

onMounted(() => nextTick(render));
watch(() => props.code, () => nextTick(render));

async function download() {
  downloading.value = true;
  downloadError.value = '';
  try {
    await downloadElementAsFittedPdf(labelRef.value, `Barcode-${props.code}.pdf`, 50);
  } catch (err) {
    downloadError.value = 'Gagal membuat label, silakan coba lagi.';
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <Modal title="Barcode" size="sm" @close="$emit('close')">
    <div ref="labelRef" class="bg-white rounded-xl p-5 flex flex-col items-center text-center text-neutral-900">
      <p v-if="title" class="text-sm font-semibold mb-0.5">{{ title }}</p>
      <p v-if="subtitle" class="text-xs text-neutral-500 mb-2">{{ subtitle }}</p>
      <svg ref="svgRef"></svg>
    </div>
    <p v-if="downloadError" class="text-sm text-red-500 mt-3">{{ downloadError }}</p>
    <button class="btn-primary w-full mt-4" :disabled="downloading" @click="download">
      <Download :size="16" /> {{ downloading ? 'Membuat...' : 'Download Label (PDF)' }}
    </button>
  </Modal>
</template>

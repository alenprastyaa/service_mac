<script setup>
import { ref, watch, onMounted, nextTick } from 'vue';
import JsBarcode from 'jsbarcode';

// Small inline Code128 barcode rendered directly in a table row / card —
// distinct from BarcodeLabelModal, which is the full printable label.
const props = defineProps({
  code: { type: String, required: true },
  height: { type: Number, default: 28 },
  fontSize: { type: Number, default: 9 },
});

const svgRef = ref(null);

function render() {
  if (!svgRef.value || !props.code) return;
  JsBarcode(svgRef.value, props.code, {
    format: 'CODE128',
    displayValue: true,
    fontSize: props.fontSize,
    height: props.height,
    width: 1.2,
    margin: 2,
  });
}

onMounted(() => nextTick(render));
watch(() => props.code, () => nextTick(render));
</script>

<template>
  <svg ref="svgRef" class="max-w-full"></svg>
</template>

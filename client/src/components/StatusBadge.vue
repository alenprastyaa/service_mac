<script setup>
import { computed } from 'vue';
import { STATUS_LABELS } from '../lib/format';

const props = defineProps({ status: String });

const styles = {
  lunas: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  selesai: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  diambil: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  belum_lunas: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  menunggu_pengecekan: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  menunggu_sparepart: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  sedang_dikerjakan: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  dibatalkan: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

const style = computed(() => styles[props.status] || 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300');
const label = computed(() => STATUS_LABELS[props.status] || props.status);
</script>

<template>
  <span class="badge" :class="style">{{ label }}</span>
</template>

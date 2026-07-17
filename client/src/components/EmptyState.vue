<script setup>
defineProps({ message: { type: String, default: 'Belum ada data.' } });
</script>

<template>
  <div class="text-center py-12 text-sm text-neutral-400">
    {{ message }}
  </div>
</template>

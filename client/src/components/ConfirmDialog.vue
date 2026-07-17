<script setup>
defineProps({
  title: { type: String, default: 'Konfirmasi' },
  message: String,
  danger: { type: Boolean, default: true },
});
const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="emit('cancel')">
      <div class="card w-full max-w-sm p-6">
        <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">{{ message }}</p>
        <div class="flex justify-end gap-2">
          <button class="btn-secondary" @click="emit('cancel')">Batal</button>
          <button :class="danger ? 'btn-danger' : 'btn-primary'" @click="emit('confirm')">Ya, Lanjutkan</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

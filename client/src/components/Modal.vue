<script setup>
import { X } from 'lucide-vue-next';

defineProps({ title: String, size: { type: String, default: 'md' } });
defineEmits(['close']);

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" @click.self="$emit('close')">
      <div class="card w-full p-6 max-h-[90vh] overflow-y-auto" :class="sizes[size]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">{{ title }}</h3>
          <button @click="$emit('close')" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500">
            <X :size="18" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>

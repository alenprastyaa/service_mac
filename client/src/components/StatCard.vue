<script setup>
defineProps({
  title: String,
  value: String,
  change: String,
  changeDirection: { type: String, default: 'up' }, // 'up' | 'down' | 'neutral'
  icon: Object,
  iconBg: { type: String, default: 'bg-brand-500' },
});
</script>

<template>
  <div class="card p-5">
    <div class="flex items-start justify-between">
      <div class="min-w-0">
        <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ title }}</p>
        <p class="text-2xl font-bold mt-2 truncate">{{ value }}</p>
      </div>
      <div class="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" :class="iconBg">
        <component :is="icon" :size="20" />
      </div>
    </div>
    <p v-if="change" class="text-xs mt-3" :class="changeDirection === 'up' ? 'text-emerald-600 dark:text-emerald-400' : changeDirection === 'down' ? 'text-red-500' : 'text-neutral-500'">
      {{ change }}
    </p>
  </div>
</template>

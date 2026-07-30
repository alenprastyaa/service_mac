<script setup>
import { computed } from 'vue';
import { formatCurrency, formatDateTime } from '../lib/format';
import logo from '../assets/logo.png';

const props = defineProps({
  rows: { type: Array, required: true },
  store: { type: Object, required: true },
  // Stok is a point-in-time snapshot, not date-ranged — accepted so Laporan.vue
  // can pass the same prop set to every report component uniformly.
  from: { type: String, default: '' },
  to: { type: String, default: '' },
});

const totalNilaiStok = computed(() => props.rows.reduce((sum, r) => sum + Number(r.nilai_stok), 0));
const lowStockCount = computed(() => props.rows.filter((r) => r.stock_qty <= r.min_stock).length);
const generatedAt = computed(() => formatDateTime(new Date()));
</script>

<template>
  <div class="nota-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-8 text-neutral-900">
    <div class="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-neutral-200">
      <img :src="logo" :alt="store.store_name" class="h-14 w-auto object-contain" />
      <div class="text-right">
        <h1 class="text-xl font-bold text-neutral-800">LAPORAN STOK</h1>
        <p class="text-xs text-neutral-500 mt-1">{{ store.store_name }} · Posisi stok saat ini</p>
        <p class="text-[11px] text-neutral-400">Dicetak {{ generatedAt }}</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 mt-5">
      <div class="rounded-xl p-4 bg-gradient-to-br from-neutral-700 to-neutral-900 text-white">
        <p class="text-xs opacity-90">Total Nilai Stok</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalNilaiStok) }}</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-blue-400 to-blue-600 text-white">
        <p class="text-xs opacity-90">Jumlah Item</p>
        <p class="text-lg font-bold mt-1 truncate">{{ rows.length }}</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-red-400 to-red-600 text-white">
        <p class="text-xs opacity-90">Stok Menipis</p>
        <p class="text-lg font-bold mt-1 truncate">{{ lowStockCount }}</p>
        <p class="text-[11px] opacity-80 mt-0.5">item di bawah/sama stok minimum</p>
      </div>
    </div>

    <table v-if="rows.length" class="w-full text-sm mt-6 rounded-xl overflow-hidden">
      <thead>
        <tr class="bg-brand-500 text-white text-xs uppercase">
          <th class="px-3 py-2.5 text-left font-medium">Item</th>
          <th class="px-3 py-2.5 text-left font-medium">Kategori</th>
          <th class="px-3 py-2.5 text-right font-medium">Stok</th>
          <th class="px-3 py-2.5 text-right font-medium">Nilai Stok</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.sku" class="border-b border-neutral-100 last:border-0" :class="r.stock_qty <= r.min_stock ? 'bg-red-50' : ''">
          <td class="px-3 py-2.5">
            <p class="font-medium">{{ r.name }}</p>
            <p class="text-xs text-neutral-400">{{ r.sku }}</p>
          </td>
          <td class="px-3 py-2.5 text-neutral-600">{{ r.category }}</td>
          <td class="px-3 py-2.5 text-right" :class="r.stock_qty <= r.min_stock ? 'text-red-500 font-semibold' : ''">{{ r.stock_qty }}</td>
          <td class="px-3 py-2.5 text-right font-medium">{{ formatCurrency(r.nilai_stok) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="text-center text-neutral-400 text-sm py-10">Tidak ada data stok.</div>

    <div class="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200 text-xs text-neutral-400">
      <span>{{ store.store_name }}</span>
      <span>Laporan dibuat otomatis oleh sistem</span>
    </div>
  </div>
</template>

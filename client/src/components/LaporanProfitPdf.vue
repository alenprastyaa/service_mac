<script setup>
import { computed } from 'vue';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format';
import logo from '../assets/logo.png';

const props = defineProps({
  rows: { type: Array, required: true },
  store: { type: Object, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
});

const totalPenjualan = computed(() => props.rows.reduce((sum, r) => sum + Number(r.total_penjualan), 0));
const totalModal = computed(() => props.rows.reduce((sum, r) => sum + Number(r.total_modal), 0));
const totalProfit = computed(() => props.rows.reduce((sum, r) => sum + Number(r.profit), 0));
const generatedAt = computed(() => formatDateTime(new Date()));
</script>

<template>
  <div class="nota-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-8 text-neutral-900">
    <div class="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-neutral-200">
      <img :src="logo" :alt="store.store_name" class="h-14 w-auto object-contain" />
      <div class="text-right">
        <h1 class="text-xl font-bold text-neutral-800">LAPORAN PROFIT</h1>
        <p class="text-xs text-neutral-500 mt-1">{{ store.store_name }} · {{ formatDate(from) }} – {{ formatDate(to) }}</p>
        <p class="text-[11px] text-neutral-400">Dicetak {{ generatedAt }}</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 mt-5">
      <div class="rounded-xl p-4 bg-gradient-to-br from-blue-400 to-blue-600 text-white">
        <p class="text-xs opacity-90">Total Penjualan</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalPenjualan) }}</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-neutral-700 to-neutral-900 text-white">
        <p class="text-xs opacity-90">Total Modal</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalModal) }}</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
        <p class="text-xs opacity-90">Total Profit</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalProfit) }}</p>
        <p class="text-[11px] opacity-80 mt-0.5">{{ rows.length }} produk/unit terjual</p>
      </div>
    </div>

    <table v-if="rows.length" class="w-full text-sm mt-6 rounded-xl overflow-hidden">
      <thead>
        <tr class="bg-brand-500 text-white text-xs uppercase">
          <th class="px-3 py-2.5 text-left font-medium">Produk</th>
          <th class="px-3 py-2.5 text-right font-medium">Qty</th>
          <th class="px-3 py-2.5 text-right font-medium">Penjualan</th>
          <th class="px-3 py-2.5 text-right font-medium">Modal</th>
          <th class="px-3 py-2.5 text-right font-medium">Profit</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.sku" class="border-b border-neutral-100 last:border-0">
          <td class="px-3 py-2.5">
            <p class="font-medium">{{ r.product }}</p>
            <p class="text-xs text-neutral-400">{{ r.sku }}</p>
          </td>
          <td class="px-3 py-2.5 text-right">{{ r.qty_terjual }}</td>
          <td class="px-3 py-2.5 text-right text-neutral-600">{{ formatCurrency(r.total_penjualan) }}</td>
          <td class="px-3 py-2.5 text-right text-neutral-600">{{ formatCurrency(r.total_modal) }}</td>
          <td class="px-3 py-2.5 text-right font-semibold text-emerald-600">{{ formatCurrency(r.profit) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="text-center text-neutral-400 text-sm py-10">Tidak ada data profit untuk periode ini.</div>

    <div class="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200 text-xs text-neutral-400">
      <span>{{ store.store_name }}</span>
      <span>Laporan dibuat otomatis oleh sistem</span>
    </div>
  </div>
</template>

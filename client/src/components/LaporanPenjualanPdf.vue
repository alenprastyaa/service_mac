<script setup>
import { computed } from 'vue';
import { formatCurrency, formatDate, formatDateTime, STATUS_LABELS } from '../lib/format';
import logo from '../assets/logo.png';

const props = defineProps({
  rows: { type: Array, required: true },
  store: { type: Object, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
});

const valid = computed(() => props.rows.filter((r) => r.status !== 'dibatalkan'));
const totalPenjualan = computed(() => valid.value.reduce((sum, r) => sum + Number(r.total), 0));
const rataRata = computed(() => (valid.value.length ? totalPenjualan.value / valid.value.length : 0));
const generatedAt = computed(() => formatDateTime(new Date()));
</script>

<template>
  <div class="nota-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-8 text-neutral-900">
    <div class="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-neutral-200">
      <img :src="logo" :alt="store.store_name" class="h-14 w-auto object-contain" />
      <div class="text-right">
        <h1 class="text-xl font-bold text-neutral-800">LAPORAN PENJUALAN</h1>
        <p class="text-xs text-neutral-500 mt-1">{{ store.store_name }} · {{ formatDate(from) }} – {{ formatDate(to) }}</p>
        <p class="text-[11px] text-neutral-400">Dicetak {{ generatedAt }}</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 mt-5">
      <div class="rounded-xl p-4 bg-gradient-to-br from-brand-400 to-brand-600 text-white">
        <p class="text-xs opacity-90">Total Penjualan</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalPenjualan) }}</p>
        <p class="text-[11px] opacity-80 mt-0.5">{{ valid.length }} transaksi</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-blue-400 to-blue-600 text-white">
        <p class="text-xs opacity-90">Rata-rata / Transaksi</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(rataRata) }}</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-neutral-700 to-neutral-900 text-white">
        <p class="text-xs opacity-90">Total Transaksi</p>
        <p class="text-lg font-bold mt-1 truncate">{{ rows.length }}</p>
        <p class="text-[11px] opacity-80 mt-0.5">termasuk yang dibatalkan</p>
      </div>
    </div>

    <table v-if="rows.length" class="w-full text-sm mt-6 rounded-xl overflow-hidden">
      <thead>
        <tr class="bg-brand-500 text-white text-xs uppercase">
          <th class="px-3 py-2.5 text-left font-medium">Invoice</th>
          <th class="px-3 py-2.5 text-left font-medium">Tanggal</th>
          <th class="px-3 py-2.5 text-left font-medium">Pelanggan</th>
          <th class="px-3 py-2.5 text-right font-medium">Total</th>
          <th class="px-3 py-2.5 text-left font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.invoice_no" class="border-b border-neutral-100 last:border-0">
          <td class="px-3 py-2.5 font-medium">{{ r.invoice_no }}</td>
          <td class="px-3 py-2.5 text-neutral-600">{{ formatDateTime(r.created_at) }}</td>
          <td class="px-3 py-2.5 text-neutral-600">{{ r.customer || '-' }}</td>
          <td class="px-3 py-2.5 text-right font-medium">{{ formatCurrency(r.total) }}</td>
          <td class="px-3 py-2.5">
            <span class="badge font-medium" :class="r.status === 'lunas' ? 'bg-emerald-50 text-emerald-600' : r.status === 'belum_lunas' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'">
              {{ STATUS_LABELS[r.status] || r.status }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="text-center text-neutral-400 text-sm py-10">Tidak ada data penjualan untuk periode ini.</div>

    <div class="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200 text-xs text-neutral-400">
      <span>{{ store.store_name }}</span>
      <span>Laporan dibuat otomatis oleh sistem</span>
    </div>
  </div>
</template>

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

const selesai = computed(() => props.rows.filter((r) => ['selesai', 'diambil'].includes(r.status)));
const totalBiaya = computed(() => selesai.value.reduce((sum, r) => sum + Number(r.final_cost || 0), 0));
const generatedAt = computed(() => formatDateTime(new Date()));

const statusClass = {
  selesai: 'bg-emerald-50 text-emerald-600',
  diambil: 'bg-emerald-50 text-emerald-600',
  sedang_dikerjakan: 'bg-blue-50 text-blue-600',
  menunggu_pengecekan: 'bg-amber-50 text-amber-600',
  menunggu_sparepart: 'bg-amber-50 text-amber-600',
};
</script>

<template>
  <div class="nota-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-8 text-neutral-900">
    <div class="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-neutral-200">
      <img :src="logo" :alt="store.store_name" class="h-14 w-auto object-contain" />
      <div class="text-right">
        <h1 class="text-xl font-bold text-neutral-800">LAPORAN SERVICE</h1>
        <p class="text-xs text-neutral-500 mt-1">{{ store.store_name }} · {{ formatDate(from) }} – {{ formatDate(to) }}</p>
        <p class="text-[11px] text-neutral-400">Dicetak {{ generatedAt }}</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 mt-5">
      <div class="rounded-xl p-4 bg-gradient-to-br from-neutral-700 to-neutral-900 text-white">
        <p class="text-xs opacity-90">Total Tiket</p>
        <p class="text-lg font-bold mt-1 truncate">{{ rows.length }}</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
        <p class="text-xs opacity-90">Selesai / Diambil</p>
        <p class="text-lg font-bold mt-1 truncate">{{ selesai.length }}</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-brand-400 to-brand-600 text-white">
        <p class="text-xs opacity-90">Total Biaya Akhir</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalBiaya) }}</p>
      </div>
    </div>

    <table v-if="rows.length" class="w-full text-sm mt-6 rounded-xl overflow-hidden">
      <thead>
        <tr class="bg-brand-500 text-white text-xs uppercase">
          <th class="px-3 py-2.5 text-left font-medium">Tiket</th>
          <th class="px-3 py-2.5 text-left font-medium">Pelanggan</th>
          <th class="px-3 py-2.5 text-left font-medium">Perangkat</th>
          <th class="px-3 py-2.5 text-left font-medium">Status</th>
          <th class="px-3 py-2.5 text-right font-medium">Biaya Akhir</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.ticket_no" class="border-b border-neutral-100 last:border-0">
          <td class="px-3 py-2.5 font-medium">{{ r.ticket_no }}</td>
          <td class="px-3 py-2.5 text-neutral-600">{{ r.customer || '-' }}</td>
          <td class="px-3 py-2.5 text-neutral-600">{{ r.device_model }}</td>
          <td class="px-3 py-2.5">
            <span class="badge font-medium" :class="statusClass[r.status] || 'bg-neutral-100 text-neutral-500'">{{ STATUS_LABELS[r.status] || r.status }}</span>
          </td>
          <td class="px-3 py-2.5 text-right font-medium">{{ formatCurrency(r.final_cost) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else class="text-center text-neutral-400 text-sm py-10">Tidak ada data service untuk periode ini.</div>

    <div class="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200 text-xs text-neutral-400">
      <span>{{ store.store_name }}</span>
      <span>Laporan dibuat otomatis oleh sistem</span>
    </div>
  </div>
</template>

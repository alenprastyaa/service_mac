<script setup>
import { computed } from 'vue';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format';
import logo from '../assets/logo.png';

const props = defineProps({
  debts: { type: Array, required: true },
  store: { type: Object, required: true },
});

function isOverdue(d) {
  return d.status === 'belum_lunas' && d.due_date && new Date(d.due_date) < new Date(new Date().toDateString());
}

const unpaid = computed(() => props.debts.filter((d) => d.status === 'belum_lunas'));
const paid = computed(() => props.debts.filter((d) => d.status === 'lunas'));
const totalUnpaid = computed(() => unpaid.value.reduce((sum, d) => sum + Number(d.amount), 0));
const totalPaid = computed(() => paid.value.reduce((sum, d) => sum + Number(d.amount), 0));
const totalAll = computed(() => totalUnpaid.value + totalPaid.value);
const overdueCount = computed(() => props.debts.filter(isOverdue).length);
const generatedAt = computed(() => formatDateTime(new Date()));
</script>

<template>
  <div class="nota-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-8 text-neutral-900">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-neutral-200">
      <img :src="logo" :alt="store.store_name" class="h-14 w-auto object-contain" />
      <div class="text-right">
        <h1 class="text-xl font-bold text-neutral-800">LAPORAN HUTANG PIUTANG</h1>
        <p class="text-xs text-neutral-500 mt-1">{{ store.store_name }} · Dicetak {{ generatedAt }}</p>
      </div>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-3 gap-3 mt-5">
      <div class="rounded-xl p-4 bg-gradient-to-br from-red-400 to-red-600 text-white">
        <p class="text-xs opacity-90">Belum Lunas</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalUnpaid) }}</p>
        <p class="text-[11px] opacity-80 mt-0.5">{{ unpaid.length }} hutang{{ overdueCount ? ` · ${overdueCount} lewat tempo` : '' }}</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
        <p class="text-xs opacity-90">Lunas</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalPaid) }}</p>
        <p class="text-[11px] opacity-80 mt-0.5">{{ paid.length }} hutang</p>
      </div>
      <div class="rounded-xl p-4 bg-gradient-to-br from-neutral-700 to-neutral-900 text-white">
        <p class="text-xs opacity-90">Total Keseluruhan</p>
        <p class="text-lg font-bold mt-1 truncate">{{ formatCurrency(totalAll) }}</p>
        <p class="text-[11px] opacity-80 mt-0.5">{{ debts.length }} transaksi</p>
      </div>
    </div>

    <!-- Table -->
    <table v-if="debts.length" class="w-full text-sm mt-6 rounded-xl overflow-hidden">
      <thead>
        <tr class="bg-brand-500 text-white text-xs uppercase">
          <th class="px-3 py-2.5 text-left font-medium">Supplier</th>
          <th class="px-3 py-2.5 text-left font-medium">Keterangan</th>
          <th class="px-3 py-2.5 text-right font-medium">Nominal</th>
          <th class="px-3 py-2.5 text-left font-medium">Jatuh Tempo</th>
          <th class="px-3 py-2.5 text-left font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in debts" :key="d.id" class="border-b border-neutral-100 last:border-0" :class="isOverdue(d) ? 'bg-red-50' : ''">
          <td class="px-3 py-2.5">
            <p class="font-medium">{{ d.supplier }}</p>
            <p class="text-xs text-neutral-400">{{ d.supplier_code }}</p>
          </td>
          <td class="px-3 py-2.5 text-neutral-600">{{ d.description || '-' }}</td>
          <td class="px-3 py-2.5 text-right font-medium">{{ formatCurrency(d.amount) }}</td>
          <td class="px-3 py-2.5 text-neutral-600">
            {{ d.due_date ? formatDate(d.due_date) : '-' }}
            <span v-if="isOverdue(d)" class="block text-[10px] text-red-500 font-medium">Lewat jatuh tempo</span>
          </td>
          <td class="px-3 py-2.5">
            <span class="badge font-medium" :class="d.status === 'lunas' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
              {{ d.status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="text-center text-neutral-400 text-sm py-10">Belum ada data hutang piutang.</div>

    <!-- Footer -->
    <div class="flex items-center justify-between mt-8 pt-4 border-t border-neutral-200 text-xs text-neutral-400">
      <span>{{ store.store_name }}</span>
      <span>Laporan dibuat otomatis oleh sistem</span>
    </div>
  </div>
</template>

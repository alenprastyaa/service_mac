<script setup>
import { ref, computed, onMounted } from 'vue';
import { Wallet, CalendarRange, TrendingUp, Laptop, PackageSearch, Inbox, CheckCircle2, Clock, Wrench as WrenchIcon, Box, CalendarDays, Pencil } from 'lucide-vue-next';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import StatCard from '../components/StatCard.vue';
import StatusBadge from '../components/StatusBadge.vue';
import EmptyState from '../components/EmptyState.vue';
import Modal from '../components/Modal.vue';
import { formatCurrency, formatDate } from '../lib/format';

const auth = useAuthStore();
const isOwner = computed(() => auth.role === 'owner');
const summary = ref(null);
const loading = ref(true);

const targetProgressPct = computed(() => {
  if (!summary.value?.monthly_omzet_target) return 0;
  return Math.min(100, Math.round((summary.value.omzet_month / summary.value.monthly_omzet_target) * 100));
});

const showTargetModal = ref(false);
const targetForm = ref('');
const targetSaving = ref(false);
const targetError = ref('');

function openTargetModal() {
  targetForm.value = summary.value?.monthly_omzet_target || '';
  targetError.value = '';
  showTargetModal.value = true;
}

async function saveTarget() {
  const value = Number(targetForm.value);
  if (!Number.isFinite(value) || value < 0) {
    targetError.value = 'Masukkan nominal yang valid';
    return;
  }
  targetSaving.value = true;
  targetError.value = '';
  try {
    await api.put('/settings/target', { monthly_omzet_target: value });
    showTargetModal.value = false;
    await loadSummary();
  } catch (err) {
    targetError.value = err.response?.data?.error || 'Gagal menyimpan target';
  } finally {
    targetSaving.value = false;
  }
}

async function loadSummary() {
  const { data } = await api.get('/dashboard/summary');
  summary.value = data;
}

onMounted(async () => {
  loading.value = true;
  await loadSummary();
  loading.value = false;
});

const serviceRows = computed(() => {
  if (!summary.value) return [];
  const b = summary.value.service_status_breakdown;
  return [
    { label: 'Menunggu Pengecekan', value: b.menunggu_pengecekan, icon: Clock, bg: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
    { label: 'Sedang Dikerjakan', value: b.sedang_dikerjakan, icon: WrenchIcon, bg: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' },
    { label: 'Selesai', value: b.selesai, icon: CheckCircle2, bg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
  ];
});
</script>

<template>
  <div class="pt-2" v-if="summary">
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-sm text-neutral-500 mt-1">Berikut ringkasan aktivitas toko Anda hari ini.</p>
      </div>
      <div class="flex items-center gap-2 card-glossy px-4 py-2 text-sm">
        <CalendarDays :size="16" class="text-neutral-400" />
        {{ formatDate(new Date()) }}
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Omzet Hari Ini"
        :value="formatCurrency(summary.omzet_today)"
        :change="`${summary.omzet_today_change_pct >= 0 ? '↑' : '↓'} ${Math.abs(summary.omzet_today_change_pct)}% dari kemarin`"
        :change-direction="summary.omzet_today_change_pct >= 0 ? 'up' : 'down'"
        :icon="Wallet"
        icon-bg="bg-gradient-to-br from-brand-400 to-brand-600"
      />
      <StatCard
        title="Omzet Bulan Ini"
        :value="formatCurrency(summary.omzet_month)"
        :change="`${summary.omzet_month_change_pct >= 0 ? '↑' : '↓'} ${Math.abs(summary.omzet_month_change_pct)}% dari bulan lalu`"
        :change-direction="summary.omzet_month_change_pct >= 0 ? 'up' : 'down'"
        :icon="CalendarRange"
        icon-bg="bg-gradient-to-br from-orange-400 to-orange-600"
      />
      <StatCard
        title="Laba Kotor (Bulan Ini)"
        :value="formatCurrency(summary.gross_profit_month)"
        :change="`${summary.gross_profit_month_change_pct >= 0 ? '↑' : '↓'} ${Math.abs(summary.gross_profit_month_change_pct)}% dari bulan lalu`"
        :change-direction="summary.gross_profit_month_change_pct >= 0 ? 'up' : 'down'"
        :icon="TrendingUp"
        icon-bg="bg-gradient-to-br from-emerald-400 to-emerald-600"
      />
      <StatCard
        title="Total Stok MacBook"
        :value="`${summary.total_macbook_stock} Unit`"
        change="Unit siap jual (ready)"
        change-direction="neutral"
        :icon="Laptop"
        icon-bg="bg-gradient-to-br from-blue-400 to-blue-600"
      />
      <StatCard
        title="Total Stok Sparepart"
        :value="`${summary.total_sparepart_stock} Unit`"
        :change="`${summary.low_stock_count} part stok menipis`"
        change-direction="neutral"
        :icon="PackageSearch"
        icon-bg="bg-gradient-to-br from-purple-400 to-purple-600"
      />
      <StatCard
        title="Service Masuk"
        :value="`${summary.service_masuk_today} Unit`"
        change="Ticket masuk hari ini"
        change-direction="neutral"
        :icon="Inbox"
        icon-bg="bg-gradient-to-br from-cyan-400 to-cyan-600"
      />
      <StatCard
        title="Service Selesai"
        :value="`${summary.service_selesai_today} Unit`"
        change="Ticket selesai hari ini"
        change-direction="neutral"
        :icon="CheckCircle2"
        icon-bg="bg-gradient-to-br from-lime-500 to-lime-700"
      />
    </div>

    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Target Bulanan</h3>
        <button v-if="isOwner" @click="openTargetModal" class="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:underline">
          <Pencil :size="13" /> Atur Target
        </button>
      </div>
      <div class="card-glossy p-5">
        <template v-if="summary.monthly_omzet_target > 0">
          <div class="flex items-center justify-between mb-3">
            <p class="text-sm font-medium">Progress Omzet</p>
            <p class="text-lg font-bold text-orange-500">{{ targetProgressPct }}%</p>
          </div>
          <div class="h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden shadow-inner">
            <div
              class="relative h-full rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 shadow-[0_0_8px_rgba(249,115,22,0.5)] transition-all overflow-hidden"
              :style="{ width: `${targetProgressPct}%` }"
            >
              <div class="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"></div>
            </div>
          </div>
          <p class="text-sm text-neutral-500 mt-3">
            {{ formatCurrency(summary.omzet_month) }} dari Target {{ formatCurrency(summary.monthly_omzet_target) }}
          </p>
        </template>
        <EmptyState v-else :message="isOwner ? 'Target omzet bulanan belum diatur. Klik \'Atur Target\' untuk menetapkannya.' : 'Target omzet bulanan belum diatur oleh Owner.'" />
      </div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
      <div class="card-glossy p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">Status Service</h3>
          <router-link to="/service-macbook" class="text-xs font-medium text-brand-500 hover:underline">Lihat Semua</router-link>
        </div>
        <div class="space-y-3">
          <div v-for="row in serviceRows" :key="row.label" class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="row.bg">
              <component :is="row.icon" :size="18" />
            </div>
            <div>
              <p class="text-sm font-medium">{{ row.label }}</p>
              <p class="text-xs text-neutral-500">{{ row.value }} perangkat</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card-glossy p-5 xl:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">Transaksi Terbaru</h3>
          <router-link to="/penjualan" class="text-xs font-medium text-brand-500 hover:underline">Lihat Semua</router-link>
        </div>
        <EmptyState v-if="!summary.recent_transactions.length" message="Belum ada transaksi." />
        <div v-else class="overflow-x-auto -mx-2">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-neutral-400 text-xs uppercase">
                <th class="px-2 py-2 font-medium">Invoice</th>
                <th class="px-2 py-2 font-medium">Pelanggan</th>
                <th class="px-2 py-2 font-medium">Produk / Service</th>
                <th class="px-2 py-2 font-medium text-right">Total</th>
                <th class="px-2 py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in summary.recent_transactions" :key="`${tx.type}-${tx.id}`" class="border-t border-neutral-100 dark:border-neutral-800">
                <td class="px-2 py-2.5 font-medium">{{ tx.ref_no }}</td>
                <td class="px-2 py-2.5 text-neutral-500">{{ tx.customer_name || '-' }}</td>
                <td class="px-2 py-2.5 text-neutral-500 truncate max-w-[180px]">{{ tx.description }}</td>
                <td class="px-2 py-2.5 text-right font-medium">{{ formatCurrency(tx.total) }}</td>
                <td class="px-2 py-2.5 text-right"><StatusBadge :status="tx.status === 'Lunas' ? 'lunas' : tx.status === 'Belum Lunas' ? 'belum_lunas' : 'dibatalkan'" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card-glossy p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Stok Sparepart Menipis</h3>
        <router-link :to="{ path: '/part-macbook', query: { lowStock: 'true' } }" class="text-xs font-medium text-brand-500 hover:underline">Lihat Semua</router-link>
      </div>
      <EmptyState v-if="!summary.low_stock_products.length" message="Semua stok sparepart aman." />
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <div v-for="p in summary.low_stock_products" :key="p.id" class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <Box :size="18" class="text-neutral-400" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ p.name }}</p>
            <p class="text-xs text-neutral-500">
              Stok tersisa <span class="text-red-500 font-medium">{{ p.stock_qty }} {{ p.unit }}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="py-20 text-center text-neutral-400 text-sm">Memuat dashboard...</div>

  <Modal v-if="showTargetModal" title="Atur Target Omzet Bulanan" size="sm" @close="showTargetModal = false">
    <div class="space-y-4">
      <div>
        <label class="label">Nominal Target (Rp)</label>
        <input v-model="targetForm" type="number" min="0" step="100000" class="input" placeholder="Contoh: 170000000" />
      </div>
      <p v-if="targetError" class="text-sm text-red-500">{{ targetError }}</p>
      <div class="flex justify-end gap-2 pt-1">
        <button type="button" class="btn-secondary" @click="showTargetModal = false">Batal</button>
        <button type="button" class="btn-primary" :disabled="targetSaving" @click="saveTarget">Simpan</button>
      </div>
    </div>
  </Modal>
</template>

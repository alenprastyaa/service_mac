<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { TrendingUp, BarChart3, Box, Wrench, Clock, Wrench as WrenchIcon, CheckCircle2, CalendarDays } from 'lucide-vue-next';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import StatCard from '../components/StatCard.vue';
import SalesChart from '../components/SalesChart.vue';
import StatusBadge from '../components/StatusBadge.vue';
import EmptyState from '../components/EmptyState.vue';
import { formatCurrency, formatDate } from '../lib/format';

const auth = useAuthStore();
const summary = ref(null);
const chartPoints = ref([]);
const range = ref(7);
const loading = ref(true);

const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 11) return 'Good morning';
  if (h < 15) return 'Good afternoon';
  if (h < 18) return 'Good evening';
  return 'Good night';
});

async function loadSummary() {
  const { data } = await api.get('/dashboard/summary');
  summary.value = data;
}
async function loadChart() {
  const { data } = await api.get('/dashboard/sales-chart', { params: { range: range.value } });
  chartPoints.value = data;
}

watch(range, loadChart);

onMounted(async () => {
  loading.value = true;
  await Promise.all([loadSummary(), loadChart()]);
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
        <p class="text-lg font-medium mt-3">{{ greeting }}, {{ auth.user?.name?.split(' ')[0] }} 👋</p>
        <p class="text-sm text-neutral-500">Berikut ringkasan aktivitas toko Anda hari ini.</p>
      </div>
      <div class="flex items-center gap-2 card px-4 py-2 text-sm">
        <CalendarDays :size="16" class="text-neutral-400" />
        {{ formatDate(new Date()) }}
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total Penjualan Hari Ini"
        :value="formatCurrency(summary.total_sales_today)"
        :change="`${summary.sales_today_change_pct >= 0 ? '↑' : '↓'} ${Math.abs(summary.sales_today_change_pct)}% dari kemarin`"
        :change-direction="summary.sales_today_change_pct >= 0 ? 'up' : 'down'"
        :icon="TrendingUp"
        icon-bg="bg-brand-500"
      />
      <StatCard
        title="Total Profit Bulan Ini"
        :value="formatCurrency(summary.total_profit_month)"
        :change="`${summary.profit_month_change_pct >= 0 ? '↑' : '↓'} ${Math.abs(summary.profit_month_change_pct)}% dari bulan lalu`"
        :change-direction="summary.profit_month_change_pct >= 0 ? 'up' : 'down'"
        :icon="BarChart3"
        icon-bg="bg-emerald-500"
      />
      <StatCard
        title="Total Stok Barang"
        :value="`${summary.total_stock_units} Unit`"
        :change="`${summary.low_stock_count} produk stok menipis`"
        change-direction="neutral"
        :icon="Box"
        icon-bg="bg-blue-500"
      />
      <StatCard
        title="Service Aktif"
        :value="`${summary.active_service_count} Unit`"
        :change="`${summary.waiting_sparepart_count} menunggu sparepart`"
        change-direction="neutral"
        :icon="Wrench"
        icon-bg="bg-purple-500"
      />
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
      <div class="card p-5 xl:col-span-2">
        <div class="flex items-center justify-between mb-1">
          <div>
            <h3 class="font-semibold">Grafik Penjualan</h3>
            <p class="text-xs text-neutral-500">{{ range }} hari terakhir</p>
          </div>
          <select v-model.number="range" class="input w-auto text-sm py-1.5">
            <option :value="7">7 Hari</option>
            <option :value="30">30 Hari</option>
          </select>
        </div>
        <SalesChart :points="chartPoints" />
      </div>

      <div class="card p-5">
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
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div class="card p-5 xl:col-span-2">
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

      <div class="card p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">Stok Menipis</h3>
          <router-link to="/stok-barang" class="text-xs font-medium text-brand-500 hover:underline">Lihat Semua</router-link>
        </div>
        <EmptyState v-if="!summary.low_stock_products.length" message="Semua stok aman." />
        <div v-else class="space-y-3">
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
  </div>

  <div v-else class="py-20 text-center text-neutral-400 text-sm">Memuat dashboard...</div>
</template>

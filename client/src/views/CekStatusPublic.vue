<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Search, Laptop2, CheckCircle2, Clock, Wrench, PackageSearch, PackageCheck } from 'lucide-vue-next';
import api from '../lib/api';
import { formatDateTime } from '../lib/format';

const route = useRoute();
const ticketNo = ref(route.params.ticketNo || '');
const result = ref(null);
const error = ref('');
const loading = ref(false);
const searched = ref(false);

const STATUS_ICONS = {
  menunggu_pengecekan: Clock,
  sedang_dikerjakan: Wrench,
  menunggu_sparepart: PackageSearch,
  selesai: CheckCircle2,
  diambil: PackageCheck,
};

async function search() {
  if (!ticketNo.value.trim()) return;
  loading.value = true;
  error.value = '';
  result.value = null;
  searched.value = true;
  try {
    const { data } = await api.get(`/public/services/${ticketNo.value.trim().toUpperCase()}`);
    result.value = data;
  } catch (err) {
    error.value = err.response?.data?.error || 'Nomor tiket tidak ditemukan. Periksa kembali nomor tiket Anda.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (ticketNo.value) search();
});
</script>

<template>
  <div class="min-h-screen bg-neutral-50 flex flex-col items-center px-4 py-10">
    <div class="text-center mb-8">
      <div class="text-3xl font-bold">
        <span class="text-brand-500">Oren</span>
        <span class="text-neutral-900"> MacStore</span>
      </div>
      <p class="text-sm text-neutral-500 mt-2">Cek Status Service MacBook Anda</p>
    </div>

    <div class="card p-6 w-full max-w-md">
      <form @submit.prevent="search" class="flex gap-2 mb-2">
        <div class="relative flex-1">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input v-model="ticketNo" class="input !pl-9 uppercase" placeholder="Contoh: SRV-000045" />
        </div>
        <button type="submit" class="btn-primary" :disabled="loading">Cek</button>
      </form>
      <p class="text-xs text-neutral-400">Masukkan nomor tiket yang tertera pada nota penerimaan Anda.</p>
    </div>

    <div v-if="loading" class="text-sm text-neutral-400 mt-8">Mencari...</div>

    <p v-if="error && !loading" class="text-sm text-red-500 mt-8">{{ error }}</p>

    <div v-if="result && !loading" class="card p-6 w-full max-w-md mt-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          <Laptop2 :size="20" class="text-brand-500" />
        </div>
        <div>
          <p class="font-semibold">{{ result.device_model }}</p>
          <p class="text-xs text-neutral-400">{{ result.ticket_no }}</p>
        </div>
      </div>

      <div class="rounded-xl bg-brand-50 px-4 py-3 mb-5 flex items-center justify-between">
        <span class="text-sm text-neutral-600">Status saat ini</span>
        <span class="badge bg-white text-brand-600 font-semibold">{{ result.status_label }}</span>
      </div>

      <h4 class="text-sm font-medium mb-3">Riwayat Status</h4>
      <div class="space-y-4">
        <div v-for="(h, i) in result.history" :key="i" class="flex gap-3">
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
              <component :is="STATUS_ICONS[h.status] || Clock" :size="15" class="text-brand-500" />
            </div>
            <div v-if="i < result.history.length - 1" class="w-px flex-1 bg-neutral-200 my-1"></div>
          </div>
          <div class="pb-4">
            <p class="text-sm font-medium">{{ h.status_label }}</p>
            <p class="text-xs text-neutral-400">{{ formatDateTime(h.changed_at) }}</p>
          </div>
        </div>
      </div>

      <div class="border-t border-neutral-100 pt-4 mt-2 text-xs text-neutral-500 flex justify-between">
        <span>Estimasi pengecekan</span>
        <span class="font-medium text-neutral-700">{{ result.checkup_estimate }}</span>
      </div>
    </div>

    <p class="text-xs text-neutral-400 mt-10">&copy; {{ new Date().getFullYear() }} Oren MacStore</p>
  </div>
</template>

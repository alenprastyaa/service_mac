<script setup>
import { computed } from 'vue';
import { Clock } from 'lucide-vue-next';
import { formatDate } from '../lib/format';
import logo from '../assets/logo.png';

const props = defineProps({
  service: { type: Object, required: true },
  store: { type: Object, required: true },
  qrDataUrl: { type: String, default: '' },
});

const receivedDate = computed(() => formatDate(props.service.received_at));
</script>

<template>
  <div class="thermal-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-5 text-neutral-900 text-sm">
    <div class="flex items-center justify-center pb-2">
      <img :src="logo" :alt="store.store_name" class="h-14 w-auto object-contain" />
    </div>
    <p class="text-center text-xs text-neutral-500 pb-3">{{ store.tagline }}</p>
    <div class="text-center text-[11px] text-neutral-500 space-y-0.5 pb-3">
      <p v-if="store.address">{{ store.address }}</p>
      <p v-if="store.phone">{{ store.phone }}</p>
    </div>

    <div class="border-t border-dashed border-neutral-300 my-2"></div>
    <p class="text-center text-xs font-semibold text-brand-600">NOTA PENERIMAAN SERVICE</p>
    <div class="border-t border-dashed border-neutral-300 my-2"></div>

    <div class="text-xs space-y-1">
      <div class="flex"><span class="w-24 text-neutral-500 shrink-0">No. Tiket</span><span>: {{ service.ticket_no }}</span></div>
      <div class="flex"><span class="w-24 text-neutral-500 shrink-0">Tanggal</span><span>: {{ receivedDate }}</span></div>
      <div class="flex"><span class="w-24 text-neutral-500 shrink-0">Pelanggan</span><span>: {{ service.customer_name || '-' }}</span></div>
      <div class="flex"><span class="w-24 text-neutral-500 shrink-0">Diterima Oleh</span><span>: {{ service.received_by_name || '-' }}</span></div>
    </div>
    <div class="border-t border-dashed border-neutral-300 my-3"></div>

    <div class="text-xs space-y-1">
      <p class="font-semibold">{{ service.device_model }}</p>
      <p v-if="service.model_number" class="text-neutral-500">Model : {{ service.model_number }}</p>
      <p v-if="service.serial_number" class="text-neutral-500">SN : {{ service.serial_number }}</p>
    </div>
    <div class="border-t border-dashed border-neutral-300 my-3"></div>

    <div class="text-xs">
      <p class="text-neutral-500 mb-1">Keluhan :</p>
      <p>{{ service.complaint }}</p>
    </div>

    <div class="mt-4 flex items-center justify-between border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium">
      <span class="flex items-center gap-2"><Clock :size="14" /> Estimasi Pengecekan</span>
      <span>{{ service.checkup_estimate }}</span>
    </div>

    <div v-if="store.bank_account_number" class="mt-3 border border-dashed border-neutral-300 rounded-xl px-3 py-2 text-[11px]">
      <p class="text-neutral-500 mb-0.5">Transfer ke :</p>
      <p class="font-semibold">{{ store.bank_name }} {{ store.bank_account_number }}</p>
      <p class="text-neutral-500">a.n. {{ store.bank_account_holder }}</p>
    </div>

    <div v-if="qrDataUrl" class="flex flex-col items-center mt-4 pt-3 border-t border-dashed border-neutral-300">
      <img :src="qrDataUrl" alt="QR cek status" class="w-24 h-24 rounded-lg border border-neutral-200 mb-1.5" />
      <p class="text-[11px] text-neutral-500 text-center">Scan untuk cek status service</p>
    </div>

    <div class="text-center mt-4 pt-3 border-t border-dashed border-neutral-300">
      <p class="italic text-neutral-600">Terima kasih</p>
      <p class="text-[11px] text-neutral-500 mt-0.5">atas kepercayaan Anda ❤️</p>
    </div>
  </div>
</template>

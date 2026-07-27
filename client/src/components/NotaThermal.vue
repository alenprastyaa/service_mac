<script setup>
import { computed } from 'vue';
import { CheckCircle2, QrCode } from 'lucide-vue-next';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '../lib/format';
import logo from '../assets/logo.png';

const props = defineProps({ sale: { type: Object, required: true }, store: { type: Object, required: true } });

const saleDate = computed(() => formatDate(props.sale.created_at));
const paymentLabel = computed(() => PAYMENT_METHOD_LABELS[props.sale.payment_method] || props.sale.payment_method || '-');
</script>

<template>
  <div class="thermal-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-5 text-neutral-900 text-sm">
    <div class="flex items-center justify-center gap-2 pb-2">
      <img :src="logo" alt="logo" class="w-10 h-10 rounded-xl object-contain shrink-0" />
      <div class="text-left leading-tight">
        <p class="text-lg font-extrabold text-brand-500">{{ store.store_name }}</p>
        <p class="text-[10px] tracking-[0.25em] text-neutral-400 font-semibold">SOLO</p>
      </div>
    </div>
    <p class="text-center text-xs text-neutral-500 pb-3">{{ store.tagline }}</p>
    <div class="text-center text-[11px] text-neutral-500 space-y-0.5 pb-3">
      <p v-if="store.address">{{ store.address }}</p>
      <p v-if="store.phone">{{ store.phone }}</p>
      <p v-if="store.instagram">{{ store.instagram }}</p>
    </div>

    <div class="border-t border-dashed border-neutral-300 my-2"></div>
    <div class="text-xs space-y-1">
      <div class="flex"><span class="w-16 text-neutral-500 shrink-0">No. Nota</span><span>: {{ sale.invoice_no }}</span></div>
      <div class="flex"><span class="w-16 text-neutral-500 shrink-0">Tanggal</span><span>: {{ saleDate }}</span></div>
      <div class="flex"><span class="w-16 text-neutral-500 shrink-0">Kasir</span><span>: {{ sale.created_by_name || '-' }}</span></div>
    </div>
    <div class="border-t border-dashed border-neutral-300 my-3"></div>

    <table class="w-full text-[11px]">
      <thead>
        <tr class="text-neutral-400">
          <th class="text-left font-medium pb-1.5">Produk / Service</th>
          <th class="text-center font-medium pb-1.5">Qty</th>
          <th class="text-right font-medium pb-1.5">Harga</th>
          <th class="text-right font-medium pb-1.5">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in sale.items" :key="it.id">
          <td class="py-1 align-top">{{ it.product_name }}</td>
          <td class="py-1 text-center align-top">{{ it.qty }}</td>
          <td class="py-1 text-right align-top">{{ formatCurrency(it.price) }}</td>
          <td class="py-1 text-right align-top">{{ formatCurrency(it.subtotal) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="border-t border-dashed border-neutral-300 my-3"></div>
    <div class="text-xs space-y-1">
      <div class="flex justify-between"><span>Subtotal</span><span>{{ formatCurrency(sale.subtotal) }}</span></div>
      <div v-if="Number(sale.discount) > 0" class="flex justify-between"><span>Diskon</span><span>-{{ formatCurrency(sale.discount) }}</span></div>
      <div v-if="Number(sale.tax) > 0" class="flex justify-between"><span>Pajak</span><span>{{ formatCurrency(sale.tax) }}</span></div>
    </div>
    <div class="border-t border-neutral-300 my-2"></div>
    <div class="flex justify-between items-baseline font-bold">
      <span>TOTAL</span><span class="text-lg">{{ formatCurrency(sale.total) }}</span>
    </div>

    <div class="mt-4">
      <p class="text-[11px] text-neutral-500 mb-1.5">Metode Pembayaran :</p>
      <div class="flex items-center justify-between border border-neutral-200 rounded-xl px-3 py-2 text-xs font-medium">
        <span class="flex items-center gap-2"><QrCode :size="14" /> {{ paymentLabel }}</span>
        <CheckCircle2 :size="15" class="text-emerald-500" />
      </div>
    </div>

    <div class="text-center mt-5 pt-3 border-t border-dashed border-neutral-300">
      <p class="italic text-neutral-600">Terima kasih</p>
      <p class="text-[11px] text-neutral-500 mt-0.5">atas kepercayaan Anda ❤️</p>
    </div>
  </div>
</template>

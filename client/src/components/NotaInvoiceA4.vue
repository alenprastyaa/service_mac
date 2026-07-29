<script setup>
import { computed } from 'vue';
import { MapPin, Phone, Instagram, User, CreditCard } from 'lucide-vue-next';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS, STATUS_LABELS, ROLE_LABELS } from '../lib/format';
import logo from '../assets/logo.png';

const props = defineProps({
  sale: { type: Object, required: true },
  store: { type: Object, required: true },
  qrDataUrl: { type: String, default: '' },
});

const saleDate = computed(() => formatDate(props.sale.created_at));
const saleTime = computed(() => `${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(props.sale.created_at))} WIB`);
const paymentLabel = computed(() => PAYMENT_METHOD_LABELS[props.sale.payment_method] || props.sale.payment_method || '-');
const statusLabel = computed(() => STATUS_LABELS[props.sale.status] || props.sale.status || '-');
</script>

<template>
  <div class="nota-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-8 text-neutral-900">
    <div class="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-neutral-200">
      <div class="flex items-center gap-3">
        <img :src="logo" alt="logo" class="h-14 w-14 object-contain" />
        <div>
          <p class="text-xl font-extrabold text-brand-500 leading-tight">{{ store.store_name }}</p>
          <p class="text-[10px] tracking-[0.25em] text-neutral-400 font-semibold">SOLO</p>
          <p class="text-xs text-neutral-500 mt-1">{{ store.tagline }}</p>
        </div>
      </div>
      <div class="text-right">
        <h1 class="text-2xl font-bold text-neutral-800">INVOICE</h1>
        <span class="badge bg-brand-50 text-brand-600 font-semibold mt-2">{{ sale.invoice_no }}</span>
      </div>
    </div>

    <div class="flex flex-wrap items-start justify-between gap-4 py-4 border-b border-neutral-200">
      <div class="text-xs text-neutral-500 space-y-1.5">
        <p v-if="store.address" class="flex items-center gap-1.5"><MapPin :size="13" /> {{ store.address }}</p>
        <p v-if="store.phone" class="flex items-center gap-1.5"><Phone :size="13" /> {{ store.phone }}</p>
        <p v-if="store.instagram" class="flex items-center gap-1.5"><Instagram :size="13" /> {{ store.instagram }}</p>
      </div>
      <dl class="text-xs space-y-1 text-right">
        <div><dt class="inline text-neutral-500">Tanggal : </dt><dd class="inline font-medium">{{ saleDate }}</dd></div>
        <div><dt class="inline text-neutral-500">Waktu : </dt><dd class="inline font-medium">{{ saleTime }}</dd></div>
        <div><dt class="inline text-neutral-500">Kasir : </dt><dd class="inline font-medium">{{ sale.created_by_name || '-' }}</dd></div>
      </dl>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div class="rounded-xl border border-neutral-200 p-4 flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0"><User :size="16" class="text-neutral-500" /></div>
        <div class="text-sm">
          <p class="text-xs font-semibold text-neutral-500 mb-0.5">Pelanggan</p>
          <p class="font-medium">{{ sale.customer_name || 'Tanpa nama pelanggan' }}</p>
          <p class="text-xs text-neutral-500">{{ sale.customer_phone || '-' }}</p>
        </div>
      </div>
      <div class="rounded-xl border border-neutral-200 p-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0"><CreditCard :size="16" class="text-neutral-500" /></div>
          <div class="text-sm">
            <p class="text-xs font-semibold text-neutral-500 mb-0.5">Metode Pembayaran</p>
            <p class="font-medium">{{ paymentLabel }}</p>
          </div>
        </div>
        <span class="badge" :class="sale.status === 'lunas' ? 'bg-emerald-50 text-emerald-600' : sale.status === 'belum_lunas' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'">
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <table class="w-full text-sm mt-5 rounded-xl overflow-hidden">
      <thead>
        <tr class="bg-brand-500 text-white text-xs uppercase">
          <th class="px-3 py-2.5 text-left font-medium w-10">No.</th>
          <th class="px-3 py-2.5 text-left font-medium">Produk / Service</th>
          <th class="px-3 py-2.5 text-right font-medium">Qty</th>
          <th class="px-3 py-2.5 text-right font-medium">Harga</th>
          <th class="px-3 py-2.5 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(it, i) in sale.items" :key="it.id" class="border-b border-neutral-100 last:border-0">
          <td class="px-3 py-3 text-neutral-500">{{ i + 1 }}</td>
          <td class="px-3 py-3">
            <p class="font-medium">{{ it.product_name }}</p>
            <p class="text-xs text-neutral-400">{{ it.sku }}</p>
          </td>
          <td class="px-3 py-3 text-right">{{ it.qty }}</td>
          <td class="px-3 py-3 text-right">{{ formatCurrency(it.price) }}</td>
          <td class="px-3 py-3 text-right font-medium">{{ formatCurrency(it.subtotal) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="flex flex-wrap items-end justify-between gap-6 mt-6">
      <div v-if="qrDataUrl" class="flex items-center gap-3">
        <img :src="qrDataUrl" alt="QR" class="w-20 h-20 rounded-lg border border-neutral-200" />
        <div class="text-xs text-neutral-500 max-w-[150px]">
          <p class="font-semibold text-neutral-700 mb-0.5">Terima kasih atas kepercayaan Anda!</p>
          <p>Scan untuk kunjungi kami.</p>
        </div>
      </div>
      <div class="w-full sm:w-64 space-y-1.5 text-sm ml-auto">
        <div class="flex justify-between text-neutral-500"><span>Subtotal</span><span>{{ formatCurrency(sale.subtotal) }}</span></div>
        <div v-if="Number(sale.discount) > 0" class="flex justify-between text-orange-500"><span>Diskon</span><span>- {{ formatCurrency(sale.discount) }}</span></div>
        <div v-if="Number(sale.tax) > 0" class="flex justify-between text-neutral-500"><span>Pajak</span><span>{{ formatCurrency(sale.tax) }}</span></div>
        <div class="flex justify-between font-bold text-base border-t border-neutral-200 pt-2 mt-1"><span>TOTAL</span><span>{{ formatCurrency(sale.total) }}</span></div>
        <div v-if="store.bank_account_number" class="rounded-lg border border-neutral-200 px-3 py-2 text-xs mt-2">
          <p class="text-neutral-500 mb-0.5">Transfer ke :</p>
          <p class="font-semibold">{{ store.bank_name }} {{ store.bank_account_number }}</p>
          <p class="text-neutral-500">a.n. {{ store.bank_account_holder }}</p>
        </div>
      </div>
    </div>

    <div class="flex justify-end mt-10">
      <div class="text-center text-sm">
        <p class="text-neutral-500 mb-10">Hormat kami,<br /><span class="font-medium text-neutral-700">{{ store.store_name }}</span></p>
        <p class="border-t border-neutral-300 pt-1 font-medium">{{ sale.created_by_name || '-' }}</p>
        <p class="text-neutral-400 text-xs">{{ ROLE_LABELS[sale.created_by_role] || '-' }}</p>
      </div>
    </div>
  </div>
</template>

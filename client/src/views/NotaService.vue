<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import QRCode from 'qrcode';
import {
  MapPin, Phone, Globe, Instagram, User, Info, Laptop2, AlertCircle, Monitor, PackageCheck,
  Lock, Eye, EyeOff, Clock, ShieldCheck, Sparkles, Printer, ArrowLeft, CheckCircle2,
} from 'lucide-vue-next';
import api from '../lib/api';
import { formatDate, CHECKLIST_STATUS_LABELS, CHECKLIST_STATUS_STYLES } from '../lib/format';

const route = useRoute();
const router = useRouter();

const service = ref(null);
const store = ref(null);
const loading = ref(true);
const showPassword = ref(false);
const qrDataUrl = ref('');
const checkUrl = ref('');

const statusPillClass = {
  baik: 'bg-emerald-50 text-emerald-600',
  ada: 'bg-emerald-50 text-emerald-600',
  rusak: 'bg-red-50 text-red-500',
  tidak_dicek: 'bg-amber-50 text-amber-600',
  tidak_ada: 'bg-neutral-100 text-neutral-500',
};

const receivedDate = computed(() => service.value && formatDate(service.value.received_at));
const receivedTime = computed(() => {
  if (!service.value?.received_at) return '-';
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(service.value.received_at)) + ' WIB';
});

async function load() {
  loading.value = true;
  const [svcRes, storeRes] = await Promise.all([api.get(`/services/${route.params.id}`), api.get('/settings/store')]);
  service.value = svcRes.data;
  store.value = storeRes.data;

  checkUrl.value = `${window.location.origin}/cek-service/${service.value.ticket_no}`;
  qrDataUrl.value = await QRCode.toDataURL(checkUrl.value, { width: 180, margin: 1, color: { dark: '#171717', light: '#ffffff' } });
  loading.value = false;
}

function maskedPassword(pwd) {
  if (!pwd) return '-';
  return showPassword.value ? pwd : '•'.repeat(Math.max(pwd.length, 6));
}

function printNota() {
  window.print();
}

onMounted(load);
</script>

<template>
  <div class="pt-2 pb-10">
    <div class="no-print flex items-center justify-between mb-4 max-w-[820px] mx-auto">
      <button class="btn-secondary" @click="router.back()"><ArrowLeft :size="16" /> Kembali</button>
      <button class="btn-primary" :disabled="loading" @click="printNota"><Printer :size="16" /> Cetak Nota</button>
    </div>

    <div v-if="loading" class="text-center py-20 text-sm text-neutral-400">Memuat nota...</div>

    <div v-else class="nota-page mx-auto rounded-2xl shadow-card border border-neutral-100 p-8 text-neutral-900">
      <!-- Header -->
      <div class="flex items-start justify-between flex-wrap gap-4 pb-5 border-b border-neutral-200">
        <div class="flex items-center gap-3">
          <div class="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center text-white text-3xl font-bold shrink-0">O</div>
          <div>
            <p class="text-2xl font-bold leading-tight"><span class="text-brand-500">Oren</span> MacStore</p>
            <p class="text-xs text-neutral-500 flex items-center gap-1 mt-0.5"> {{ store.tagline }}</p>
          </div>
        </div>
        <div class="text-right">
          <h1 class="text-xl font-bold leading-tight">NOTA PENERIMAAN<br />SERVICE MACBOOK</h1>
          <span class="badge bg-brand-50 text-brand-600 font-semibold mt-2"># {{ service.ticket_no }}</span>
        </div>
      </div>

      <!-- Contact row -->
      <div class="flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-500 py-4 border-b border-neutral-200">
        <span class="flex items-center gap-1.5"><MapPin :size="14" /> {{ store.address }}</span>
        <span class="flex items-center gap-1.5"><Phone :size="14" /> {{ store.phone }}</span>
        <span class="flex items-center gap-1.5"><Globe :size="14" /> {{ store.website }}</span>
        <span class="flex items-center gap-1.5"><Instagram :size="14" /> {{ store.instagram }}</span>
      </div>

      <!-- Info pelanggan & service -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-3"><User :size="15" /> INFORMASI PELANGGAN</h3>
          <dl class="text-sm space-y-1.5">
            <div class="flex"><dt class="w-28 text-neutral-500 shrink-0">Nama</dt><dd>: {{ service.customer_name || '-' }}</dd></div>
            <div class="flex"><dt class="w-28 text-neutral-500 shrink-0">No. HP / WA</dt><dd>: {{ service.customer_phone || '-' }}</dd></div>
            <div class="flex"><dt class="w-28 text-neutral-500 shrink-0">Email</dt><dd>: {{ service.customer_email || '-' }}</dd></div>
            <div class="flex"><dt class="w-28 text-neutral-500 shrink-0">Alamat</dt><dd>: {{ service.customer_address || '-' }}</dd></div>
          </dl>
        </div>
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-3"><Info :size="15" /> INFORMASI SERVICE</h3>
          <dl class="text-sm space-y-1.5">
            <div class="flex"><dt class="w-28 text-neutral-500 shrink-0">No. Penerimaan</dt><dd>: <span class="text-brand-600 font-medium">{{ service.ticket_no }}</span></dd></div>
            <div class="flex"><dt class="w-28 text-neutral-500 shrink-0">Tanggal Terima</dt><dd>: {{ receivedDate }}</dd></div>
            <div class="flex"><dt class="w-28 text-neutral-500 shrink-0">Waktu Terima</dt><dd>: {{ receivedTime }}</dd></div>
            <div class="flex"><dt class="w-28 text-neutral-500 shrink-0">Diterima Oleh</dt><dd>: {{ service.received_by_name || '-' }}</dd></div>
            <div class="flex items-center"><dt class="w-28 text-neutral-500 shrink-0">Status</dt><dd>: <span class="badge bg-brand-50 text-brand-600 ml-1"><CheckCircle2 :size="12" class="mr-1" /> UNIT DITERIMA</span></dd></div>
          </dl>
        </div>
      </div>

      <!-- Device & keluhan -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="rounded-xl border border-neutral-200 p-4 flex gap-4">
          <div class="w-24 h-24 rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center shrink-0">
            <Laptop2 :size="36" class="text-neutral-300" />
          </div>
          <div class="min-w-0">
            <p class="font-semibold mb-1 leading-snug">{{ service.device_model }}</p>
            <dl class="text-xs space-y-1 text-neutral-600">
              <div class="flex"><dt class="w-20 shrink-0">Model</dt><dd>: {{ service.model_number || '-' }}</dd></div>
              <div class="flex"><dt class="w-20 shrink-0">Serial Number</dt><dd>: {{ service.serial_number || '-' }}</dd></div>
              <div class="flex"><dt class="w-20 shrink-0">Warna</dt><dd>: {{ service.device_color || '-' }}</dd></div>
              <div class="flex"><dt class="w-20 shrink-0">Storage / RAM</dt><dd>: {{ service.device_storage || '-' }}</dd></div>
              <div class="flex items-center flex-wrap">
                <dt class="w-20 shrink-0">Password</dt>
                <dd class="flex items-center gap-1.5 flex-wrap">
                  <span>: {{ maskedPassword(service.device_password) }}</span>
                  <button v-if="service.device_password" class="no-print text-neutral-400 hover:text-brand-500" @click="showPassword = !showPassword">
                    <component :is="showPassword ? EyeOff : Eye" :size="12" />
                  </button>
                  <span v-if="service.device_password" class="inline-flex items-center gap-0.5 text-emerald-600 whitespace-nowrap"><Lock :size="10" />Tersimpan Aman</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-2"><AlertCircle :size="15" /> KELUHAN / MASALAH</h3>
          <p class="text-sm text-neutral-700">{{ service.complaint }}</p>
        </div>
      </div>

      <!-- Checklist -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-3"><Monitor :size="15" /> KONDISI FISIK SAAT DITERIMA</h3>
          <div v-if="!service.checklist.kondisi_fisik.length" class="text-xs text-neutral-400">Belum ada data checklist.</div>
          <div v-for="item in service.checklist.kondisi_fisik" :key="item.id" class="flex items-center justify-between text-sm py-1.5 border-b border-dashed border-neutral-100 last:border-0">
            <span>{{ item.label }}</span>
            <span class="badge" :class="statusPillClass[item.status]">{{ CHECKLIST_STATUS_LABELS[item.status] }}</span>
          </div>
          <p class="text-[11px] text-neutral-400 mt-3">Kondisi di atas berdasarkan pemeriksaan visual. Kerusakan tersembunyi tidak dapat dideteksi saat unit diterima.</p>
        </div>
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-3"><PackageCheck :size="15" /> KELENGKAPAN YANG DITITIPKAN</h3>
          <div v-if="!service.checklist.kelengkapan.length" class="text-xs text-neutral-400">Belum ada data checklist.</div>
          <div v-for="item in service.checklist.kelengkapan" :key="item.id" class="flex items-center justify-between text-sm py-1.5 border-b border-dashed border-neutral-100 last:border-0">
            <span>{{ item.label }}</span>
            <span class="badge" :class="statusPillClass[item.status]">{{ CHECKLIST_STATUS_LABELS[item.status] }}</span>
          </div>
        </div>
      </div>

      <!-- Password box & estimasi -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-1"><Lock :size="15" /> PASSWORD / LOGIN (JIKA DIPERLUKAN)</h3>
          <p class="text-[11px] text-neutral-400 mb-2">Diperlukan untuk proses pengecekan &amp; perbaikan.</p>
          <div class="bg-neutral-50 rounded-lg px-3 py-2 text-sm font-mono tracking-widest">{{ maskedPassword(service.device_password) }}</div>
        </div>
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-1"><Clock :size="15" /> ESTIMASI PENGECEKAN</h3>
          <p class="text-2xl font-bold my-1">{{ service.checkup_estimate }}</p>
          <p class="text-[11px] text-neutral-400">Kami akan menghubungi Anda setelah proses pengecekan selesai.</p>
        </div>
      </div>

      <!-- Catatan & Persetujuan -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-2"><Info :size="15" /> CATATAN PENTING</h3>
          <ul class="text-xs text-neutral-600 space-y-1 list-disc list-inside">
            <li v-for="(line, i) in (store.intake_notice || '').split('\n').filter(Boolean)" :key="i">{{ line }}</li>
          </ul>
        </div>
        <div class="rounded-xl border border-neutral-200 p-4">
          <h3 class="flex items-center gap-2 text-sm font-semibold text-brand-600 mb-2"><ShieldCheck :size="15" /> PERSETUJUAN PENGECEKAN</h3>
          <p class="text-xs text-neutral-600">{{ store.consent_text }}</p>
        </div>
      </div>

      <!-- QR & signatures -->
      <div class="flex flex-wrap items-end justify-between gap-6 mt-6 pt-5 border-t border-neutral-200">
        <div class="flex items-center gap-3">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Cek Status" class="w-24 h-24 rounded-lg border border-neutral-200" />
          <div class="text-xs text-neutral-500 max-w-[160px]">
            <p class="font-semibold text-neutral-700 mb-0.5">CEK STATUS SERVICE</p>
            <p>Scan QR untuk melihat status dan riwayat service Anda.</p>
            <p class="text-brand-500 mt-1 break-all">{{ checkUrl.replace('https://', '').replace('http://', '') }}</p>
          </div>
        </div>
        <div class="flex gap-10 text-center text-xs">
          <div>
            <p class="text-neutral-500 mb-8">Diterima Oleh,</p>
            <p class="border-t border-neutral-300 pt-1 font-medium">{{ service.received_by_name || '-' }}</p>
            <p class="text-neutral-400">Teknisi</p>
          </div>
          <div>
            <p class="text-neutral-500 mb-8">Diserahkan Oleh,</p>
            <p class="border-t border-neutral-300 pt-1 font-medium">{{ service.customer_name || '-' }}</p>
            <p class="text-neutral-400">Pelanggan</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-neutral-200 text-xs text-neutral-400">
        <div class="flex items-center gap-2"><ShieldCheck :size="14" /> Apple Specialist Service</div>
        <div class="flex items-center gap-2"><CheckCircle2 :size="14" /> Garansi Resmi</div>
        <div class="flex items-center gap-2"><Sparkles :size="14" /> Trusted Store</div>
        <div class="text-brand-500 font-medium italic">Thank you for trusting Oren MacStore!</div>
      </div>
    </div>
  </div>
</template>

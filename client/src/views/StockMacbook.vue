<script setup>
import { ref, computed, onMounted } from 'vue';
import { Search, Plus, Pencil, Trash2, Eye, Image as ImageIcon, BatteryFull, RotateCw, ScanLine } from 'lucide-vue-next';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import EmptyState from '../components/EmptyState.vue';
import BarcodeLabelModal from '../components/BarcodeLabelModal.vue';
import BarcodeMini from '../components/BarcodeMini.vue';
import ScanBarcodeModal from '../components/ScanBarcodeModal.vue';
import { formatCurrency, formatDateTime } from '../lib/format';
import { macbookBarcodeValue, parseMacbookUnitCode } from '../lib/barcode';

const auth = useAuthStore();
const canEdit = computed(() => auth.can('owner', 'admin'));

const macbooks = ref([]);
const search = ref('');
const statusFilter = ref('');
const loading = ref(true);

const showModal = ref(false);
const editing = ref(null);
const form = ref(emptyForm());
const photoFile = ref(null);
const photoPreview = ref(null);
const saving = ref(false);
const formError = ref('');

const deleting = ref(null);
const viewing = ref(null);
const barcodeItem = ref(null);
const showScan = ref(false);

async function lookupMacbook(code) {
  // 1) Try matching the unit's own serial number (typed in when the unit was added).
  const { data: results } = await api.get('/macbooks', { params: { search: code } });
  const bySerial = results.find((m) => m.serial_number && m.serial_number.toLowerCase() === code.toLowerCase());
  if (bySerial) {
    viewing.value = bySerial;
    return true;
  }

  // 2) Fall back to our own auto-generated MB###### code.
  const id = parseMacbookUnitCode(code);
  if (!id) return false;
  try {
    const { data } = await api.get(`/macbooks/${id}`);
    viewing.value = data;
    return true;
  } catch (err) {
    return false;
  }
}

function emptyForm() {
  return {
    model_name: '', chip: '', ram: '', storage: '', color: '',
    battery_pct: 100, cycle_count: 0, serial_number: '',
    modal_price: 0, jual_price: 0, status: 'ready', notes: '',
  };
}

const STATUS_META = {
  ready: { label: 'READY', class: 'bg-emerald-500 text-white' },
  terjual: { label: 'TERJUAL', class: 'bg-neutral-500 text-white' },
  service: { label: 'SERVICE', class: 'bg-amber-500 text-white' },
};

function specLine(m) {
  return [m.chip, m.ram, m.storage].filter(Boolean).join(' • ') || '-';
}
function batteryClass(pct) {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-amber-500';
  return 'text-red-500';
}

async function load() {
  loading.value = true;
  const { data } = await api.get('/macbooks', { params: { search: search.value, status: statusFilter.value } });
  macbooks.value = data;
  loading.value = false;
}
let searchTimer;
function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(load, 300);
}

function openCreate() {
  editing.value = null;
  form.value = emptyForm();
  photoFile.value = null;
  photoPreview.value = null;
  formError.value = '';
  showModal.value = true;
}
function openEdit(m) {
  editing.value = m;
  form.value = {
    model_name: m.model_name, chip: m.chip || '', ram: m.ram || '', storage: m.storage || '', color: m.color || '',
    battery_pct: m.battery_pct, cycle_count: m.cycle_count, serial_number: m.serial_number || '',
    modal_price: Number(m.modal_price), jual_price: Number(m.jual_price), status: m.status, notes: m.notes || '',
  };
  photoFile.value = null;
  photoPreview.value = m.photo_url;
  formError.value = '';
  showModal.value = true;
}

function onPhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  photoFile.value = file;
  photoPreview.value = URL.createObjectURL(file);
}

async function submit() {
  saving.value = true;
  formError.value = '';
  try {
    const fd = new FormData();
    Object.entries(form.value).forEach(([k, v]) => fd.append(k, v));
    if (photoFile.value) fd.append('photo', photoFile.value);

    if (editing.value) {
      await api.put(`/macbooks/${editing.value.id}`, fd);
    } else {
      await api.post('/macbooks', fd);
    }
    showModal.value = false;
    await load();
  } catch (err) {
    formError.value = err.response?.data?.error || 'Gagal menyimpan unit MacBook';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  await api.delete(`/macbooks/${deleting.value.id}`);
  deleting.value = null;
  await load();
}

onMounted(load);
</script>

<template>
  <div class="pt-2">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Stock MacBook</h1>
        <p class="text-sm text-neutral-500">Kelola unit MacBook dan pantau ketersediaan stok.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-secondary" @click="showScan = true"><ScanLine :size="16" /> Scan Barcode</button>
        <button v-if="canEdit" class="btn-primary" @click="openCreate"><Plus :size="16" /> Tambah Unit</button>
      </div>
    </div>

    <div class="card p-4 mb-5 flex flex-wrap gap-3">
      <div class="relative flex-1 min-w-[220px]">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" @input="onSearchInput" class="input !pl-9" placeholder="Cari model atau serial number..." />
      </div>
      <select v-model="statusFilter" @change="load" class="input w-auto">
        <option value="">Semua Status</option>
        <option value="ready">Ready</option>
        <option value="terjual">Terjual</option>
        <option value="service">Service</option>
      </select>
    </div>

    <EmptyState v-if="!loading && !macbooks.length" message="Belum ada unit MacBook." />

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="m in macbooks" :key="m.id" class="card overflow-hidden flex flex-col">
        <div class="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-800">
          <img v-if="m.photo_url" :src="m.photo_url" :alt="m.model_name" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-neutral-300 dark:text-neutral-600">
            <ImageIcon :size="36" />
          </div>
          <span class="badge absolute top-2.5 right-2.5 font-semibold tracking-wide" :class="STATUS_META[m.status]?.class">
            {{ STATUS_META[m.status]?.label || m.status }}
          </span>
        </div>

        <div class="p-4 flex-1 flex flex-col gap-3">
          <div>
            <p class="font-semibold leading-snug truncate">{{ m.model_name }}</p>
            <p class="text-xs text-neutral-500 mt-0.5">{{ specLine(m) }}</p>
            <p v-if="m.color" class="text-xs text-neutral-400">{{ m.color }}</p>
          </div>

          <div class="flex items-center gap-3 text-xs">
            <span class="inline-flex items-center gap-1 font-medium" :class="batteryClass(m.battery_pct)">
              <BatteryFull :size="14" /> {{ m.battery_pct }}%
            </span>
            <span class="inline-flex items-center gap-1 text-neutral-500">
              <RotateCw :size="13" /> {{ m.cycle_count }} Cycle
            </span>
          </div>

          <p class="text-xs text-neutral-400 font-mono flex items-center gap-1">
            <ScanLine :size="13" /> {{ m.serial_number || '-' }}
          </p>

          <button class="self-start hover:opacity-70" title="Klik untuk cetak label" @click="barcodeItem = m">
            <BarcodeMini :code="macbookBarcodeValue(m)" />
          </button>

          <div class="mt-auto pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-neutral-400">Modal</span>
              <span class="text-neutral-500">{{ formatCurrency(m.modal_price) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-neutral-500">Jual</span>
              <span class="font-semibold text-brand-600 dark:text-brand-400">{{ formatCurrency(m.jual_price) }}</span>
            </div>
          </div>
        </div>

        <div class="flex border-t border-neutral-100 dark:border-neutral-800">
          <button class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800" @click="viewing = m">
            <Eye :size="14" /> Detail
          </button>
          <template v-if="canEdit">
            <div class="w-px bg-neutral-100 dark:bg-neutral-800" />
            <button class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800" @click="openEdit(m)">
              <Pencil :size="14" /> Edit
            </button>
            <div class="w-px bg-neutral-100 dark:bg-neutral-800" />
            <button class="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950" @click="deleting = m">
              <Trash2 :size="14" /> Hapus
            </button>
          </template>
        </div>
      </div>
    </div>

    <Modal v-if="showModal" :title="editing ? 'Edit Unit MacBook' : 'Tambah Unit MacBook'" size="lg" @close="showModal = false">
      <form @submit.prevent="submit" class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-24 h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
            <img v-if="photoPreview" :src="photoPreview" class="w-full h-full object-cover" />
            <ImageIcon v-else :size="28" class="text-neutral-300 dark:text-neutral-600" />
          </div>
          <div class="flex-1">
            <label class="label">Foto Unit</label>
            <input type="file" accept="image/*" class="input" @change="onPhotoChange" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2">
            <label class="label">Model</label>
            <input v-model="form.model_name" required class="input" placeholder="MacBook Air M4" />
          </div>
          <div>
            <label class="label">Chip</label>
            <input v-model="form.chip" class="input" placeholder="M4" />
          </div>
          <div>
            <label class="label">Warna</label>
            <input v-model="form.color" class="input" placeholder="Silver" />
          </div>
          <div>
            <label class="label">RAM</label>
            <input v-model="form.ram" class="input" placeholder="16GB" />
          </div>
          <div>
            <label class="label">Storage</label>
            <input v-model="form.storage" class="input" placeholder="512GB" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="label">Baterai (%)</label>
            <input v-model.number="form.battery_pct" type="number" min="0" max="100" class="input" />
          </div>
          <div>
            <label class="label">Cycle Count</label>
            <input v-model.number="form.cycle_count" type="number" min="0" class="input" />
          </div>
          <div>
            <label class="label">Status</label>
            <select v-model="form.status" class="input">
              <option value="ready">Ready</option>
              <option value="terjual">Terjual</option>
              <option value="service">Service</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label">Serial Number</label>
          <input v-model="form.serial_number" class="input" placeholder="C02XXXXXXX" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="label">Harga Modal</label>
            <input v-model.number="form.modal_price" type="number" min="0" class="input" />
          </div>
          <div>
            <label class="label">Harga Jual</label>
            <input v-model.number="form.jual_price" type="number" min="0" class="input" />
          </div>
        </div>

        <div>
          <label class="label">Catatan</label>
          <textarea v-model="form.notes" rows="2" class="input" placeholder="Opsional" />
        </div>

        <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="showModal = false">Batal</button>
          <button type="submit" class="btn-primary" :disabled="saving">Simpan</button>
        </div>
      </form>
    </Modal>

    <Modal v-if="viewing" title="Detail Unit MacBook" @close="viewing = null">
      <div class="space-y-4">
        <div class="aspect-[4/3] rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
          <img v-if="viewing.photo_url" :src="viewing.photo_url" class="w-full h-full object-cover" />
          <ImageIcon v-else :size="36" class="text-neutral-300 dark:text-neutral-600" />
        </div>
        <div class="flex items-center justify-between">
          <h4 class="font-semibold text-lg">{{ viewing.model_name }}</h4>
          <span class="badge font-semibold" :class="STATUS_META[viewing.status]?.class">{{ STATUS_META[viewing.status]?.label }}</span>
        </div>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
          <div><dt class="text-xs text-neutral-400">Kode Unit</dt><dd class="font-mono">{{ macbookBarcodeValue(viewing) }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Spesifikasi</dt><dd>{{ specLine(viewing) }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Warna</dt><dd>{{ viewing.color || '-' }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Baterai</dt><dd>{{ viewing.battery_pct }}%</dd></div>
          <div><dt class="text-xs text-neutral-400">Cycle Count</dt><dd>{{ viewing.cycle_count }}</dd></div>
          <div class="sm:col-span-2"><dt class="text-xs text-neutral-400">Serial Number</dt><dd class="font-mono">{{ viewing.serial_number || '-' }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Harga Modal</dt><dd>{{ formatCurrency(viewing.modal_price) }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Harga Jual</dt><dd class="font-semibold text-brand-600 dark:text-brand-400">{{ formatCurrency(viewing.jual_price) }}</dd></div>
          <div class="sm:col-span-2" v-if="viewing.notes"><dt class="text-xs text-neutral-400">Catatan</dt><dd>{{ viewing.notes }}</dd></div>
          <div class="sm:col-span-2"><dt class="text-xs text-neutral-400">Ditambahkan</dt><dd>{{ formatDateTime(viewing.created_at) }}</dd></div>
        </dl>
        <div class="flex justify-end gap-2 pt-2">
          <button class="btn-secondary" @click="barcodeItem = viewing"><ScanLine :size="14" /> Barcode</button>
          <button class="btn-secondary" @click="viewing = null">Tutup</button>
        </div>
      </div>
    </Modal>

    <ConfirmDialog
      v-if="deleting"
      title="Hapus Unit MacBook"
      :message="`Yakin ingin menghapus '${deleting.model_name}'? Tindakan ini tidak dapat dibatalkan.`"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />

    <BarcodeLabelModal
      v-if="barcodeItem"
      :code="macbookBarcodeValue(barcodeItem)"
      :title="barcodeItem.model_name"
      :subtitle="macbookBarcodeValue(barcodeItem)"
      @close="barcodeItem = null"
    />

    <ScanBarcodeModal v-if="showScan" title="Scan Barcode Unit MacBook" :lookup="lookupMacbook" @close="showScan = false" />
  </div>
</template>

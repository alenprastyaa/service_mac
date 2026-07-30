<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Search, Plus, Pencil, Trash2, Box, Eye, ScanLine } from 'lucide-vue-next';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import EmptyState from '../components/EmptyState.vue';
import BarcodeLabelModal from '../components/BarcodeLabelModal.vue';
import BarcodeMini from '../components/BarcodeMini.vue';
import ScanBarcodeModal from '../components/ScanBarcodeModal.vue';
import { useStoreSettingsStore } from '../stores/storeSettings';
import { formatCurrency, formatDateTime } from '../lib/format';

const auth = useAuthStore();
const route = useRoute();
const storeSettings = useStoreSettingsStore();
const canEdit = computed(() => auth.can('owner', 'admin'));

const products = ref([]);
const search = ref('');
const category = ref('');
const lowStockOnly = ref(route.query.lowStock === 'true');
const loading = ref(true);

const showModal = ref(false);
const editing = ref(null);
const form = ref(emptyForm());
const saving = ref(false);
const formError = ref('');

const deleting = ref(null);
const viewing = ref(null);
const barcodeItem = ref(null);
const showScan = ref(false);

async function lookupProduct(code) {
  const { data } = await api.get('/products', { params: { search: code } });
  const match = data.find((p) => p.sku.toLowerCase() === code.toLowerCase()) || (data.length === 1 ? data[0] : null);
  if (!match) return false;
  viewing.value = match;
  return true;
}

function emptyForm() {
  return {
    sku: '', name: '', category: 'Sparepart', brand: 'Apple', purchase_price: 0, sell_price: 0, stock_qty: 0,
    min_stock: storeSettings.data?.default_min_stock ?? 3, unit: 'unit',
  };
}

const categories = computed(() => [...new Set(products.value.map((p) => p.category))]);

async function load() {
  loading.value = true;
  const { data } = await api.get('/products', {
    params: { search: search.value, category: category.value, lowStock: lowStockOnly.value ? 'true' : '' },
  });
  products.value = data;
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
  formError.value = '';
  showModal.value = true;
}
function openEdit(p) {
  editing.value = p;
  form.value = { ...p, purchase_price: Number(p.purchase_price), sell_price: Number(p.sell_price) };
  formError.value = '';
  showModal.value = true;
}

async function submit() {
  saving.value = true;
  formError.value = '';
  try {
    if (editing.value) {
      await api.put(`/products/${editing.value.id}`, form.value);
    } else {
      await api.post('/products', form.value);
    }
    showModal.value = false;
    await load();
  } catch (err) {
    formError.value = err.response?.data?.error || 'Gagal menyimpan part';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  await api.delete(`/products/${deleting.value.id}`);
  deleting.value = null;
  await load();
}

function stockClass(p) {
  if (p.stock_qty <= p.min_stock) return 'text-red-500 font-semibold';
  if (p.stock_qty <= p.min_stock * 2) return 'text-amber-500 font-semibold';
  return 'text-emerald-600 font-semibold';
}

onMounted(() => {
  load();
  storeSettings.fetch();
});
</script>

<template>
  <div class="pt-2">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Part MacBook</h1>
        <p class="text-sm text-neutral-500">Kelola sparepart & aksesoris MacBook dan pantau ketersediaan stok.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-secondary" @click="showScan = true"><ScanLine :size="16" /> Scan Barcode</button>
        <button v-if="canEdit" class="btn-primary" @click="openCreate"><Plus :size="16" /> Tambah Part</button>
      </div>
    </div>

    <div class="card p-4 mb-4 flex flex-wrap gap-3">
      <div class="relative flex-1 min-w-[220px]">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" @input="onSearchInput" class="input !pl-9" placeholder="Cari nama atau SKU part..." />
      </div>
      <select v-model="category" @change="load" class="input w-auto">
        <option value="">Semua Kategori</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <label class="flex items-center gap-2 text-sm px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 cursor-pointer select-none">
        <input type="checkbox" v-model="lowStockOnly" @change="load" class="accent-brand-500" />
        Stok Menipis
      </label>
    </div>

    <div class="card p-5">
      <EmptyState v-if="!loading && !products.length" message="Belum ada part." />
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Part</th>
              <th class="px-2 py-2 font-medium">Barcode</th>
              <th class="px-2 py-2 font-medium">Kategori</th>
              <th class="px-2 py-2 font-medium text-right">Harga Beli</th>
              <th class="px-2 py-2 font-medium text-right">Harga Jual</th>
              <th class="px-2 py-2 font-medium text-right">Stok</th>
              <th class="px-2 py-2 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Box :size="16" class="text-neutral-400" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium truncate">{{ p.name }}</p>
                    <p class="text-xs text-neutral-400">{{ p.sku }}</p>
                  </div>
                </div>
              </td>
              <td class="px-2 py-3">
                <button class="hover:opacity-70" title="Klik untuk cetak label" @click="barcodeItem = p"><BarcodeMini :code="p.sku" /></button>
              </td>
              <td class="px-2 py-3 text-neutral-500">{{ p.category }}</td>
              <td class="px-2 py-3 text-right text-neutral-500">{{ formatCurrency(p.purchase_price) }}</td>
              <td class="px-2 py-3 text-right font-medium">{{ formatCurrency(p.sell_price) }}</td>
              <td class="px-2 py-3 text-right">
                <span :class="stockClass(p)">{{ p.stock_qty }}</span>
                <span class="text-neutral-400"> {{ p.unit }}</span>
              </td>
              <td class="px-2 py-3">
                <div class="flex justify-end gap-1">
                  <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" title="Detail" @click="viewing = p"><Eye :size="15" /></button>
                  <template v-if="canEdit">
                    <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" @click="openEdit(p)"><Pencil :size="15" /></button>
                    <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950 text-red-500" @click="deleting = p"><Trash2 :size="15" /></button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showModal" :title="editing ? 'Edit Part' : 'Tambah Part'" @close="showModal = false">
      <form @submit.prevent="submit" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">SKU</label>
            <input v-model="form.sku" required :disabled="!!editing" class="input" />
          </div>
          <div>
            <label class="label">Nama Part</label>
            <input v-model="form.name" required class="input" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Kategori</label>
            <input v-model="form.category" class="input" placeholder="Sparepart / Aksesoris" />
          </div>
          <div>
            <label class="label">Brand</label>
            <input v-model="form.brand" class="input" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Harga Beli</label>
            <input v-model.number="form.purchase_price" type="number" min="0" class="input" />
          </div>
          <div>
            <label class="label">Harga Jual</label>
            <input v-model.number="form.sell_price" type="number" min="0" class="input" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div v-if="!editing">
            <label class="label">Stok Awal</label>
            <input v-model.number="form.stock_qty" type="number" min="0" class="input" />
          </div>
          <div>
            <label class="label">Stok Minimum</label>
            <input v-model.number="form.min_stock" type="number" min="0" class="input" />
          </div>
          <div>
            <label class="label">Satuan</label>
            <input v-model="form.unit" class="input" />
          </div>
        </div>

        <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="showModal = false">Batal</button>
          <button type="submit" class="btn-primary" :disabled="saving">Simpan</button>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      v-if="deleting"
      title="Hapus Part"
      :message="`Yakin ingin menghapus '${deleting.name}'? Tindakan ini tidak dapat dibatalkan.`"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />

    <Modal v-if="viewing" title="Detail Part" @close="viewing = null">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold text-lg">{{ viewing.name }}</h4>
          <button class="btn-secondary text-xs" @click="barcodeItem = viewing"><ScanLine :size="14" /> Barcode</button>
        </div>
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-3 text-sm">
          <div><dt class="text-xs text-neutral-400">SKU</dt><dd class="font-mono">{{ viewing.sku }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Kategori</dt><dd>{{ viewing.category }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Brand</dt><dd>{{ viewing.brand }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Satuan</dt><dd>{{ viewing.unit }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Harga Beli</dt><dd>{{ formatCurrency(viewing.purchase_price) }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Harga Jual</dt><dd class="font-semibold text-brand-600 dark:text-brand-400">{{ formatCurrency(viewing.sell_price) }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Stok</dt><dd :class="stockClass(viewing)">{{ viewing.stock_qty }} {{ viewing.unit }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Stok Minimum</dt><dd>{{ viewing.min_stock }} {{ viewing.unit }}</dd></div>
          <div class="sm:col-span-2"><dt class="text-xs text-neutral-400">Ditambahkan</dt><dd>{{ formatDateTime(viewing.created_at) }}</dd></div>
        </dl>
        <div class="flex justify-end pt-2">
          <button class="btn-secondary" @click="viewing = null">Tutup</button>
        </div>
      </div>
    </Modal>

    <BarcodeLabelModal
      v-if="barcodeItem"
      :code="barcodeItem.sku"
      :title="barcodeItem.name"
      :subtitle="barcodeItem.sku"
      @close="barcodeItem = null"
    />

    <ScanBarcodeModal v-if="showScan" title="Scan Barcode Part" :lookup="lookupProduct" @close="showScan = false" />
  </div>
</template>

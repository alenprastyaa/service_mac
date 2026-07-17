<script setup>
import { ref, onMounted } from 'vue';
import { PackagePlus } from 'lucide-vue-next';
import api from '../lib/api';
import EmptyState from '../components/EmptyState.vue';
import { formatDateTime } from '../lib/format';

const products = ref([]);
const suppliers = ref([]);
const movements = ref([]);
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const success = ref('');

const form = ref({ product_id: '', supplier_id: '', qty: 1, note: '' });

async function loadAll() {
  loading.value = true;
  const [p, s, m] = await Promise.all([
    api.get('/products'),
    api.get('/suppliers'),
    api.get('/stock-movements', { params: { type: 'in' } }),
  ]);
  products.value = p.data;
  suppliers.value = s.data;
  movements.value = m.data;
  loading.value = false;
}

async function submit() {
  error.value = '';
  success.value = '';
  saving.value = true;
  try {
    await api.post('/stock-movements', form.value);
    success.value = 'Stok berhasil ditambahkan.';
    form.value = { product_id: '', supplier_id: '', qty: 1, note: '' };
    await loadAll();
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal menyimpan barang masuk';
  } finally {
    saving.value = false;
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="pt-2">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Barang Masuk</h1>
      <p class="text-sm text-neutral-500">Catat penerimaan stok dari supplier.</p>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div class="card p-5">
        <h3 class="font-semibold mb-4 flex items-center gap-2"><PackagePlus :size="18" class="text-brand-500" /> Form Barang Masuk</h3>
        <form @submit.prevent="submit" class="space-y-4">
          <div>
            <label class="label">Produk</label>
            <select v-model="form.product_id" required class="input">
              <option value="" disabled>Pilih produk</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
            </select>
          </div>
          <div>
            <label class="label">Supplier</label>
            <select v-model="form.supplier_id" class="input">
              <option value="">Tanpa supplier</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div>
            <label class="label">Jumlah</label>
            <input v-model.number="form.qty" type="number" min="1" required class="input" />
          </div>
          <div>
            <label class="label">Catatan</label>
            <input v-model="form.note" class="input" placeholder="Opsional" />
          </div>

          <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
          <p v-if="success" class="text-sm text-emerald-600">{{ success }}</p>

          <button type="submit" class="btn-primary w-full" :disabled="saving">Simpan Barang Masuk</button>
        </form>
      </div>

      <div class="card p-5 xl:col-span-2">
        <h3 class="font-semibold mb-4">Riwayat Barang Masuk</h3>
        <EmptyState v-if="!loading && !movements.length" message="Belum ada riwayat barang masuk." />
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-neutral-400 text-xs uppercase">
                <th class="px-2 py-2 font-medium">Tanggal</th>
                <th class="px-2 py-2 font-medium">Produk</th>
                <th class="px-2 py-2 font-medium">Supplier</th>
                <th class="px-2 py-2 font-medium text-right">Jumlah</th>
                <th class="px-2 py-2 font-medium">Dicatat oleh</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movements" :key="m.id" class="border-t border-neutral-100 dark:border-neutral-800">
                <td class="px-2 py-2.5 text-neutral-500">{{ formatDateTime(m.created_at) }}</td>
                <td class="px-2 py-2.5 font-medium">{{ m.product_name }}</td>
                <td class="px-2 py-2.5 text-neutral-500">{{ m.supplier_name || '-' }}</td>
                <td class="px-2 py-2.5 text-right text-emerald-600 font-medium">+{{ m.qty }}</td>
                <td class="px-2 py-2.5 text-neutral-500">{{ m.created_by_name || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

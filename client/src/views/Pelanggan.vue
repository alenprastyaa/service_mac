<script setup>
import { ref, computed, onMounted } from 'vue';
import { Search, Plus, Pencil, Trash2, User, Eye } from 'lucide-vue-next';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import StatusBadge from '../components/StatusBadge.vue';
import EmptyState from '../components/EmptyState.vue';
import { formatCurrency, formatDateTime } from '../lib/format';

const auth = useAuthStore();
const canDelete = computed(() => auth.can('owner', 'admin'));

const customers = ref([]);
const search = ref('');
const loading = ref(true);

const showModal = ref(false);
const editing = ref(null);
const form = ref(emptyForm());
const saving = ref(false);
const formError = ref('');
const deleting = ref(null);

const showDetail = ref(false);
const detail = ref(null);

function emptyForm() {
  return { name: '', phone: '', address: '' };
}

async function load() {
  loading.value = true;
  const { data } = await api.get('/customers', { params: { search: search.value } });
  customers.value = data;
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
function openEdit(c) {
  editing.value = c;
  form.value = { ...c };
  formError.value = '';
  showModal.value = true;
}

async function submit() {
  saving.value = true;
  formError.value = '';
  try {
    if (editing.value) await api.put(`/customers/${editing.value.id}`, form.value);
    else await api.post('/customers', form.value);
    showModal.value = false;
    await load();
  } catch (err) {
    formError.value = err.response?.data?.error || 'Gagal menyimpan pelanggan';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  await api.delete(`/customers/${deleting.value.id}`);
  deleting.value = null;
  await load();
}

async function openDetail(c) {
  const { data } = await api.get(`/customers/${c.id}`);
  detail.value = data;
  showDetail.value = true;
}

onMounted(load);
</script>

<template>
  <div class="pt-2">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Pelanggan</h1>
        <p class="text-sm text-neutral-500">Data pelanggan toko dan riwayat transaksinya.</p>
      </div>
      <button class="btn-primary" @click="openCreate"><Plus :size="16" /> Tambah Pelanggan</button>
    </div>

    <div class="card p-4 mb-4">
      <div class="relative max-w-md">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" @input="onSearchInput" class="input !pl-9" placeholder="Cari nama atau telepon..." />
      </div>
    </div>

    <div class="card p-5">
      <EmptyState v-if="!loading && !customers.length" message="Belum ada pelanggan." />
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Nama</th>
              <th class="px-2 py-2 font-medium">Telepon</th>
              <th class="px-2 py-2 font-medium">Alamat</th>
              <th class="px-2 py-2 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in customers" :key="c.id" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <User :size="15" class="text-neutral-400" />
                  </div>
                  <span class="font-medium">{{ c.name }}</span>
                </div>
              </td>
              <td class="px-2 py-3 text-neutral-500">{{ c.phone || '-' }}</td>
              <td class="px-2 py-3 text-neutral-500 truncate max-w-[200px]">{{ c.address || '-' }}</td>
              <td class="px-2 py-3">
                <div class="flex justify-end gap-1">
                  <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" @click="openDetail(c)"><Eye :size="15" /></button>
                  <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" @click="openEdit(c)"><Pencil :size="15" /></button>
                  <button v-if="canDelete" class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950 text-red-500" @click="deleting = c"><Trash2 :size="15" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showModal" :title="editing ? 'Edit Pelanggan' : 'Tambah Pelanggan'" @close="showModal = false">
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="label">Nama</label>
          <input v-model="form.name" required class="input" />
        </div>
        <div>
          <label class="label">Telepon</label>
          <input v-model="form.phone" class="input" />
        </div>
        <div>
          <label class="label">Alamat</label>
          <textarea v-model="form.address" rows="2" class="input"></textarea>
        </div>

        <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="showModal = false">Batal</button>
          <button type="submit" class="btn-primary" :disabled="saving">Simpan</button>
        </div>
      </form>
    </Modal>

    <Modal v-if="showDetail && detail" :title="detail.name" @close="showDetail = false">
      <div class="text-sm space-y-1 mb-5">
        <p><span class="text-neutral-500">Telepon:</span> {{ detail.phone || '-' }}</p>
        <p><span class="text-neutral-500">Alamat:</span> {{ detail.address || '-' }}</p>
      </div>

      <h4 class="font-medium text-sm mb-2">Riwayat Pembelian</h4>
      <EmptyState v-if="!detail.sales.length" message="Belum ada transaksi." />
      <div v-else class="space-y-1.5 text-sm mb-5">
        <div v-for="s in detail.sales" :key="s.id" class="flex justify-between items-center">
          <span>{{ s.invoice_no }} · {{ formatDateTime(s.created_at) }}</span>
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ formatCurrency(s.total) }}</span>
            <StatusBadge :status="s.status" />
          </div>
        </div>
      </div>

      <h4 class="font-medium text-sm mb-2">Riwayat Service</h4>
      <EmptyState v-if="!detail.services.length" message="Belum ada riwayat service." />
      <div v-else class="space-y-1.5 text-sm">
        <div v-for="s in detail.services" :key="s.id" class="flex justify-between items-center">
          <span>{{ s.ticket_no }} · {{ s.device_model }}</span>
          <StatusBadge :status="s.status" />
        </div>
      </div>
    </Modal>

    <ConfirmDialog
      v-if="deleting"
      title="Hapus Pelanggan"
      :message="`Yakin ingin menghapus '${deleting.name}'?`"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

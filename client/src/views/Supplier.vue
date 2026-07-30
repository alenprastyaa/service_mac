<script setup>
import { ref, computed, onMounted } from 'vue';
import { Search, Plus, Pencil, Trash2, Truck, Eye, CircleCheck, Landmark } from 'lucide-vue-next';
import api from '../lib/api';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import EmptyState from '../components/EmptyState.vue';
import { formatDateTime, formatDate, formatCurrency } from '../lib/format';

const suppliers = ref([]);
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

const debtForm = ref(emptyDebtForm());
const debtSaving = ref(false);
const debtError = ref('');

function emptyForm() {
  return { name: '', contact_person: '', phone: '', email: '', address: '', city: '', bank_name: '', bank_account_number: '', bank_account_holder: '' };
}
function emptyDebtForm() {
  return { amount: '', description: '', due_date: '' };
}

function isOverdue(d) {
  return d.status === 'belum_lunas' && d.due_date && new Date(d.due_date) < new Date(new Date().toDateString());
}
const totalUnpaid = computed(() => {
  if (!detail.value) return 0;
  return detail.value.debts.filter((d) => d.status === 'belum_lunas').reduce((sum, d) => sum + Number(d.amount), 0);
});

async function load() {
  loading.value = true;
  const { data } = await api.get('/suppliers', { params: { search: search.value } });
  suppliers.value = data;
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
function openEdit(s) {
  editing.value = s;
  form.value = { ...emptyForm(), ...s };
  formError.value = '';
  showModal.value = true;
}

async function submit() {
  saving.value = true;
  formError.value = '';
  try {
    if (editing.value) await api.put(`/suppliers/${editing.value.id}`, form.value);
    else await api.post('/suppliers', form.value);
    showModal.value = false;
    await load();
  } catch (err) {
    formError.value = err.response?.data?.error || 'Gagal menyimpan supplier';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  await api.delete(`/suppliers/${deleting.value.id}`);
  deleting.value = null;
  await load();
}

async function openDetail(s) {
  const { data } = await api.get(`/suppliers/${s.id}`);
  detail.value = data;
  debtForm.value = emptyDebtForm();
  debtError.value = '';
  showDetail.value = true;
}

async function addDebt() {
  const amount = Number(debtForm.value.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    debtError.value = 'Masukkan nominal hutang yang valid';
    return;
  }
  debtSaving.value = true;
  debtError.value = '';
  try {
    await api.post(`/suppliers/${detail.value.id}/debts`, debtForm.value);
    debtForm.value = emptyDebtForm();
    await openDetail(detail.value);
  } catch (err) {
    debtError.value = err.response?.data?.error || 'Gagal menyimpan hutang';
  } finally {
    debtSaving.value = false;
  }
}

async function payDebt(d) {
  debtSaving.value = true;
  try {
    await api.put(`/suppliers/${detail.value.id}/debts/${d.id}/pay`);
    await openDetail(detail.value);
  } finally {
    debtSaving.value = false;
  }
}

async function removeDebt(d) {
  debtSaving.value = true;
  try {
    await api.delete(`/suppliers/${detail.value.id}/debts/${d.id}`);
    await openDetail(detail.value);
  } finally {
    debtSaving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="pt-2">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Supplier</h1>
        <p class="text-sm text-neutral-500">Kelola mitra pemasok produk toko.</p>
      </div>
      <button class="btn-primary" @click="openCreate"><Plus :size="16" /> Tambah Supplier</button>
    </div>

    <div class="card p-4 mb-4">
      <div class="relative max-w-md">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" @input="onSearchInput" class="input !pl-9" placeholder="Cari kode, nama supplier, atau kontak..." />
      </div>
    </div>

    <div class="card p-5">
      <EmptyState v-if="!loading && !suppliers.length" message="Belum ada supplier." />
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Kode</th>
              <th class="px-2 py-2 font-medium">Nama Supplier</th>
              <th class="px-2 py-2 font-medium">Kontak</th>
              <th class="px-2 py-2 font-medium">Telepon</th>
              <th class="px-2 py-2 font-medium">Kota</th>
              <th class="px-2 py-2 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in suppliers" :key="s.id" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-3 text-neutral-400 font-mono text-xs">{{ s.code || '-' }}</td>
              <td class="px-2 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Truck :size="15" class="text-neutral-400" />
                  </div>
                  <span class="font-medium">{{ s.name }}</span>
                </div>
              </td>
              <td class="px-2 py-3 text-neutral-500">{{ s.contact_person || '-' }}</td>
              <td class="px-2 py-3 text-neutral-500">{{ s.phone || '-' }}</td>
              <td class="px-2 py-3 text-neutral-500">{{ s.city || '-' }}</td>
              <td class="px-2 py-3">
                <div class="flex justify-end gap-1">
                  <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" @click="openDetail(s)"><Eye :size="15" /></button>
                  <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" @click="openEdit(s)"><Pencil :size="15" /></button>
                  <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950 text-red-500" @click="deleting = s"><Trash2 :size="15" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showModal" :title="editing ? 'Edit Supplier' : 'Tambah Supplier'" size="lg" @close="showModal = false">
      <form @submit.prevent="submit" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="label">Nama Supplier</label>
            <input v-model="form.name" required class="input" />
          </div>
          <div>
            <label class="label">Nama PIC</label>
            <input v-model="form.contact_person" class="input" />
          </div>
          <div>
            <label class="label">No. HP / WhatsApp</label>
            <input v-model="form.phone" class="input" />
          </div>
          <div>
            <label class="label">Email</label>
            <input v-model="form.email" type="email" class="input" />
          </div>
          <div class="sm:col-span-2">
            <label class="label">Alamat</label>
            <textarea v-model="form.address" rows="2" class="input"></textarea>
          </div>
          <div>
            <label class="label">Kota</label>
            <input v-model="form.city" class="input" />
          </div>
        </div>

        <div class="border-t border-neutral-100 dark:border-neutral-800 pt-4">
          <h4 class="flex items-center gap-2 text-sm font-medium mb-3"><Landmark :size="15" class="text-brand-500" /> Rekening Bank</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="label">Nama Bank</label>
              <input v-model="form.bank_name" class="input" placeholder="cth. BCA" />
            </div>
            <div>
              <label class="label">Nomor Rekening</label>
              <input v-model="form.bank_account_number" class="input" />
            </div>
            <div class="sm:col-span-2">
              <label class="label">Atas Nama</label>
              <input v-model="form.bank_account_holder" class="input" />
            </div>
          </div>
        </div>

        <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="showModal = false">Batal</button>
          <button type="submit" class="btn-primary" :disabled="saving">Simpan</button>
        </div>
      </form>
    </Modal>

    <Modal v-if="showDetail && detail" :title="detail.name" size="lg" @close="showDetail = false">
      <div class="space-y-5">
        <dl class="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
          <div><dt class="text-xs text-neutral-400">Kode Supplier</dt><dd class="font-mono">{{ detail.code || '-' }}</dd></div>
          <div><dt class="text-xs text-neutral-400">PIC</dt><dd>{{ detail.contact_person || '-' }}</dd></div>
          <div><dt class="text-xs text-neutral-400">No. HP / WhatsApp</dt><dd>{{ detail.phone || '-' }}</dd></div>
          <div><dt class="text-xs text-neutral-400">Email</dt><dd>{{ detail.email || '-' }}</dd></div>
          <div class="sm:col-span-2"><dt class="text-xs text-neutral-400">Alamat</dt><dd>{{ detail.address || '-' }}<span v-if="detail.city">, {{ detail.city }}</span></dd></div>
          <div v-if="detail.bank_name || detail.bank_account_number" class="sm:col-span-2">
            <dt class="text-xs text-neutral-400">Rekening Bank</dt>
            <dd>{{ detail.bank_name }} {{ detail.bank_account_number }} <span class="text-neutral-400">a.n. {{ detail.bank_account_holder }}</span></dd>
          </div>
        </dl>

        <div class="border-t border-neutral-100 dark:border-neutral-800 pt-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium text-sm">Hutang Piutang</h4>
            <p v-if="totalUnpaid > 0" class="text-sm font-semibold text-red-500">Total Belum Lunas: {{ formatCurrency(totalUnpaid) }}</p>
          </div>

          <EmptyState v-if="!detail.debts.length" message="Belum ada catatan hutang." />
          <div v-else class="space-y-2 mb-4">
            <div
              v-for="d in detail.debts"
              :key="d.id"
              class="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm"
              :class="isOverdue(d) ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30' : 'border-neutral-200 dark:border-neutral-800'"
            >
              <div class="min-w-0">
                <p class="font-medium">{{ formatCurrency(d.amount) }} <span v-if="d.description" class="font-normal text-neutral-500">· {{ d.description }}</span></p>
                <p class="text-xs" :class="isOverdue(d) ? 'text-red-500 font-medium' : 'text-neutral-400'">
                  <span v-if="d.due_date">Jatuh tempo {{ formatDate(d.due_date) }}<span v-if="isOverdue(d)"> · Lewat jatuh tempo</span></span>
                  <span v-else>Tanpa jatuh tempo</span>
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="d.status === 'lunas'" class="badge bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"><CircleCheck :size="12" class="mr-1" /> Lunas</span>
                <button v-else class="btn-secondary text-xs" :disabled="debtSaving" @click="payDebt(d)">Tandai Lunas</button>
                <button class="text-neutral-400 hover:text-red-500" :disabled="debtSaving" @click="removeDebt(d)"><Trash2 :size="14" /></button>
              </div>
            </div>
          </div>

          <form @submit.prevent="addDebt" class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input v-model.number="debtForm.amount" type="number" min="0" placeholder="Nominal hutang" class="input text-sm" />
            <input v-model="debtForm.description" placeholder="Keterangan (opsional)" class="input text-sm" />
            <input v-model="debtForm.due_date" type="date" class="input text-sm" />
            <p v-if="debtError" class="text-sm text-red-500 sm:col-span-3">{{ debtError }}</p>
            <button type="submit" class="btn-primary text-sm sm:col-span-3" :disabled="debtSaving">Tambah Hutang</button>
          </form>
        </div>

        <div class="border-t border-neutral-100 dark:border-neutral-800 pt-4">
          <h4 class="font-medium text-sm mb-2">Riwayat Barang Masuk</h4>
          <EmptyState v-if="!detail.movements.length" message="Belum ada riwayat pengiriman." />
          <div v-else class="space-y-1.5 text-sm">
            <div v-for="m in detail.movements" :key="m.id" class="flex justify-between">
              <span>{{ m.product_name }} · {{ formatDateTime(m.created_at) }}</span>
              <span class="text-emerald-600 font-medium">+{{ m.qty }}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    <ConfirmDialog
      v-if="deleting"
      title="Hapus Supplier"
      :message="`Yakin ingin menghapus '${deleting.name}'?`"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />
  </div>
</template>

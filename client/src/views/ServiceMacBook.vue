<script setup>
import { ref, computed, onMounted } from 'vue';
import { Plus, Search, Laptop2, Wrench, UserPlus, Users, Printer, Monitor, PackageCheck, Trash2, Pencil, X } from 'lucide-vue-next';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import Modal from '../components/Modal.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import StatusBadge from '../components/StatusBadge.vue';
import EmptyState from '../components/EmptyState.vue';
import ServiceSuccessModal from '../components/ServiceSuccessModal.vue';
import { formatCurrency, formatDateTime, KONDISI_FISIK_OPTIONS, KELENGKAPAN_OPTIONS } from '../lib/format';

const auth = useAuthStore();
const canCreate = computed(() => auth.can('owner', 'admin', 'kasir'));
const canDelete = computed(() => auth.can('owner', 'admin'));

const tickets = ref([]);
const customers = ref([]);
const technicians = ref([]);
const products = ref([]);
const search = ref('');
const statusFilter = ref('');
const loading = ref(true);

const STATUS_TABS = [
  { value: '', label: 'Semua' },
  { value: 'menunggu_pengecekan', label: 'Menunggu Pengecekan' },
  { value: 'sedang_dikerjakan', label: 'Sedang Dikerjakan' },
  { value: 'menunggu_sparepart', label: 'Menunggu Sparepart' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'diambil', label: 'Sudah Diambil' },
];

async function loadTickets() {
  loading.value = true;
  const { data } = await api.get('/services', { params: { search: search.value, status: statusFilter.value } });
  tickets.value = data;
  loading.value = false;
}
let searchTimer;
function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadTickets, 300);
}

// Create ticket modal — checklist rows come from /checklist-templates (owner/admin configurable), never hardcoded here.
const showCreate = ref(false);
const newCustomerMode = ref(false);
const createForm = ref(emptyCreateForm());
const createChecklist = ref({ kondisi_fisik: [], kelengkapan: [] });
const createError = ref('');
const creating = ref(false);
const successServiceId = ref(null);

function emptyCreateForm() {
  return {
    customer_id: '', new_customer: { name: '', phone: '', address: '' },
    device_model: '', model_number: '', serial_number: '', device_color: '', device_storage: '', device_password: '',
    complaint: '', estimated_cost: 0, checkup_estimate: '1 x 24 Jam',
  };
}

async function openCreate() {
  createForm.value = emptyCreateForm();
  newCustomerMode.value = false;
  createError.value = '';
  if (!customers.value.length) customers.value = (await api.get('/customers')).data;

  const { data: templates } = await api.get('/checklist-templates', { params: { activeOnly: 'true' } });
  createChecklist.value = {
    kondisi_fisik: templates.filter((t) => t.category === 'kondisi_fisik').map((t) => ({ template_id: t.id, label: t.label, status: 'baik' })),
    kelengkapan: templates.filter((t) => t.category === 'kelengkapan').map((t) => ({ template_id: t.id, label: t.label, status: 'ada' })),
  };
  showCreate.value = true;
}

async function submitCreate() {
  creating.value = true;
  createError.value = '';
  try {
    const payload = {
      ...createForm.value,
      customer_id: newCustomerMode.value ? '' : createForm.value.customer_id,
      new_customer: newCustomerMode.value ? createForm.value.new_customer : undefined,
      checklist: [
        ...createChecklist.value.kondisi_fisik.map((c) => ({ ...c, category: 'kondisi_fisik' })),
        ...createChecklist.value.kelengkapan.map((c) => ({ ...c, category: 'kelengkapan' })),
      ],
    };
    const { data } = await api.post('/services', payload);
    showCreate.value = false;
    successServiceId.value = data.id;
  } catch (err) {
    createError.value = err.response?.data?.error || 'Gagal membuat tiket service';
  } finally {
    creating.value = false;
  }
}

function closeSuccessModal() {
  successServiceId.value = null;
  loadTickets();
}

// Detail modal
const showDetail = ref(false);
const detail = ref(null);
const statusForm = ref({ status: '', note: '', final_cost: 0 });
const diagnosisForm = ref({ diagnosis: '', technician_id: '' });
const sparepartForm = ref({ product_id: '', qty: 1 });
const detailSaving = ref(false);
const detailError = ref('');

const editDeviceMode = ref(false);
const deviceForm = ref(emptyDeviceForm());
const deleting = ref(null);

function emptyDeviceForm() {
  return { device_model: '', model_number: '', serial_number: '', device_color: '', device_storage: '', complaint: '', estimated_cost: 0, checkup_estimate: '', device_password: '' };
}

async function openDetail(ticket) {
  if (!technicians.value.length) technicians.value = (await api.get('/services/technicians')).data;
  if (!products.value.length) products.value = (await api.get('/products')).data;
  await loadDetail(ticket.id);
  showDetail.value = true;
}

async function loadDetail(id) {
  const { data } = await api.get(`/services/${id}`);
  detail.value = data;
  statusForm.value = { status: data.status, note: '', final_cost: Number(data.final_cost) || 0 };
  diagnosisForm.value = { diagnosis: data.diagnosis || '', technician_id: data.technician_id || '' };
  deviceForm.value = {
    device_model: data.device_model, model_number: data.model_number || '', serial_number: data.serial_number || '',
    device_color: data.device_color || '', device_storage: data.device_storage || '', complaint: data.complaint,
    estimated_cost: Number(data.estimated_cost) || 0, checkup_estimate: data.checkup_estimate || '', device_password: '',
  };
  editDeviceMode.value = false;
  detailError.value = '';
}

async function saveDeviceInfo() {
  detailSaving.value = true;
  detailError.value = '';
  try {
    const payload = { ...deviceForm.value };
    if (!payload.device_password) delete payload.device_password;
    await api.put(`/services/${detail.value.id}`, payload);
    editDeviceMode.value = false;
    await loadDetail(detail.value.id);
    await loadTickets();
  } catch (err) {
    detailError.value = err.response?.data?.error || 'Gagal menyimpan info perangkat';
  } finally {
    detailSaving.value = false;
  }
}

async function saveDiagnosis() {
  detailSaving.value = true;
  detailError.value = '';
  try {
    await api.put(`/services/${detail.value.id}`, { ...diagnosisForm.value, technician_id: diagnosisForm.value.technician_id || null });
    await loadDetail(detail.value.id);
  } catch (err) {
    detailError.value = err.response?.data?.error || 'Gagal menyimpan';
  } finally {
    detailSaving.value = false;
  }
}

async function saveStatus() {
  detailSaving.value = true;
  detailError.value = '';
  try {
    await api.put(`/services/${detail.value.id}/status`, statusForm.value);
    await loadDetail(detail.value.id);
    await loadTickets();
  } catch (err) {
    detailError.value = err.response?.data?.error || 'Gagal mengubah status';
  } finally {
    detailSaving.value = false;
  }
}

async function addSparepart() {
  if (!sparepartForm.value.product_id) return;
  detailSaving.value = true;
  detailError.value = '';
  try {
    await api.post(`/services/${detail.value.id}/items`, sparepartForm.value);
    sparepartForm.value = { product_id: '', qty: 1 };
    await loadDetail(detail.value.id);
  } catch (err) {
    detailError.value = err.response?.data?.error || 'Gagal menambahkan sparepart';
  } finally {
    detailSaving.value = false;
  }
}

async function removeSparepart(item) {
  detailSaving.value = true;
  detailError.value = '';
  try {
    await api.delete(`/services/${detail.value.id}/items/${item.id}`);
    await loadDetail(detail.value.id);
  } catch (err) {
    detailError.value = err.response?.data?.error || 'Gagal menghapus sparepart';
  } finally {
    detailSaving.value = false;
  }
}

async function confirmDeleteTicket() {
  await api.delete(`/services/${deleting.value.id}`);
  deleting.value = null;
  showDetail.value = false;
  await loadTickets();
}

onMounted(loadTickets);
</script>

<template>
  <div class="pt-2">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Service MacBook</h1>
        <p class="text-sm text-neutral-500">Kelola tiket perbaikan dari penerimaan hingga selesai.</p>
      </div>
      <button v-if="canCreate" class="btn-primary" @click="openCreate"><Plus :size="16" /> Tiket Baru</button>
    </div>

    <div class="card p-4 mb-4 space-y-3">
      <div class="relative max-w-md">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" @input="onSearchInput" class="input !pl-9" placeholder="Cari tiket, pelanggan, atau perangkat..." />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="tab in STATUS_TABS"
          :key="tab.value"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          :class="statusFilter === tab.value ? 'bg-brand-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'"
          @click="statusFilter = tab.value; loadTickets()"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div class="card p-5">
      <EmptyState v-if="!loading && !tickets.length" message="Belum ada tiket service." />
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Tiket</th>
              <th class="px-2 py-2 font-medium">Pelanggan</th>
              <th class="px-2 py-2 font-medium">Perangkat</th>
              <th class="px-2 py-2 font-medium">Teknisi</th>
              <th class="px-2 py-2 font-medium">Diterima</th>
              <th class="px-2 py-2 font-medium">Status</th>
              <th v-if="canDelete" class="px-2 py-2 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tickets" :key="t.id" class="border-t border-neutral-100 dark:border-neutral-800 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50" @click="openDetail(t)">
              <td class="px-2 py-3 font-medium">{{ t.ticket_no }}</td>
              <td class="px-2 py-3 text-neutral-500">{{ t.customer_name || '-' }}</td>
              <td class="px-2 py-3">
                <div class="flex items-center gap-2">
                  <Laptop2 :size="15" class="text-neutral-400 shrink-0" />
                  {{ t.device_model }}
                </div>
              </td>
              <td class="px-2 py-3 text-neutral-500">{{ t.technician_name || 'Belum ditugaskan' }}</td>
              <td class="px-2 py-3 text-neutral-500">{{ formatDateTime(t.received_at) }}</td>
              <td class="px-2 py-3"><StatusBadge :status="t.status" /></td>
              <td v-if="canDelete" class="px-2 py-3 text-right">
                <button class="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950 text-red-500" @click.stop="deleting = t">
                  <Trash2 :size="15" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal: full intake form matching the printed nota -->
    <Modal v-if="showCreate" title="Tiket Service Baru" size="xl" @close="showCreate = false">
      <form @submit.prevent="submitCreate" class="space-y-5">
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="label !mb-0">Pelanggan</label>
            <button type="button" class="text-xs font-medium text-brand-500 flex items-center gap-1" @click="newCustomerMode = !newCustomerMode">
              <component :is="newCustomerMode ? Users : UserPlus" :size="13" />
              {{ newCustomerMode ? 'Pilih pelanggan terdaftar' : 'Pelanggan baru' }}
            </button>
          </div>
          <select v-if="!newCustomerMode" v-model="createForm.customer_id" required class="input">
            <option value="" disabled>Pilih pelanggan</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <div v-else class="grid grid-cols-2 gap-3">
            <input v-model="createForm.new_customer.name" required placeholder="Nama pelanggan" class="input col-span-2" />
            <input v-model="createForm.new_customer.phone" placeholder="No. HP / WA" class="input col-span-2" />
            <textarea v-model="createForm.new_customer.address" placeholder="Alamat" rows="2" class="input col-span-2"></textarea>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label class="label">Model Perangkat</label>
            <input v-model="createForm.device_model" required class="input" placeholder="MacBook Air M1 13-inch" />
          </div>
          <div>
            <label class="label">Model Number</label>
            <input v-model="createForm.model_number" class="input" placeholder="A2337 (M1, 2020)" />
          </div>
          <div>
            <label class="label">Serial Number</label>
            <input v-model="createForm.serial_number" class="input" />
          </div>
          <div>
            <label class="label">Warna</label>
            <input v-model="createForm.device_color" class="input" placeholder="Space Gray" />
          </div>
          <div>
            <label class="label">Storage / RAM</label>
            <input v-model="createForm.device_storage" class="input" placeholder="256GB / 8GB" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Password / Login Perangkat</label>
            <input v-model="createForm.device_password" class="input" placeholder="Opsional, disimpan terenkripsi" />
          </div>
          <div>
            <label class="label">Estimasi Pengecekan</label>
            <input v-model="createForm.checkup_estimate" class="input" placeholder="1 x 24 Jam" />
          </div>
        </div>

        <div>
          <label class="label">Keluhan</label>
          <textarea v-model="createForm.complaint" required rows="2" class="input"></textarea>
        </div>
        <div>
          <label class="label">Estimasi Biaya (Rp)</label>
          <input v-model.number="createForm.estimated_cost" type="number" min="0" class="input" />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
            <h4 class="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase mb-2"><Monitor :size="14" /> Kondisi Fisik Saat Diterima</h4>
            <p v-if="!createChecklist.kondisi_fisik.length" class="text-xs text-neutral-400">Belum ada item checklist. Tambahkan di Pengaturan.</p>
            <div v-for="item in createChecklist.kondisi_fisik" :key="item.template_id" class="grid grid-cols-[1fr,92px] items-center gap-2 py-1.5 text-sm">
              <span class="min-w-0 truncate" :title="item.label">{{ item.label }}</span>
              <select v-model="item.status" class="input !w-full !py-1 !px-2 text-xs">
                <option v-for="opt in KONDISI_FISIK_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
            <h4 class="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase mb-2"><PackageCheck :size="14" /> Kelengkapan Yang Dititipkan</h4>
            <p v-if="!createChecklist.kelengkapan.length" class="text-xs text-neutral-400">Belum ada item checklist. Tambahkan di Pengaturan.</p>
            <div v-for="item in createChecklist.kelengkapan" :key="item.template_id" class="grid grid-cols-[1fr,84px] items-center gap-2 py-1.5 text-sm">
              <span class="min-w-0 truncate" :title="item.label">{{ item.label }}</span>
              <select v-model="item.status" class="input !w-full !py-1 !px-2 text-xs">
                <option v-for="opt in KELENGKAPAN_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <p v-if="createError" class="text-sm text-red-500">{{ createError }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="showCreate = false">Batal</button>
          <button type="submit" class="btn-primary" :disabled="creating">Buat Tiket</button>
        </div>
      </form>
    </Modal>

    <!-- Detail Modal -->
    <Modal v-if="showDetail && detail" :title="`Tiket ${detail.ticket_no}`" size="xl" @close="showDetail = false">
      <div class="space-y-4">
        <!-- Info perangkat -->
        <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div v-if="!editDeviceMode">
            <div class="flex items-start justify-between gap-2 mb-3">
              <h4 class="font-medium text-sm flex items-center gap-2"><Laptop2 :size="15" class="text-brand-500" /> Info Perangkat</h4>
              <div class="flex items-center gap-3 shrink-0">
                <StatusBadge :status="detail.status" />
                <button v-if="canCreate" class="text-xs font-medium text-brand-500 flex items-center gap-1" @click="editDeviceMode = true">
                  <Pencil :size="12" /> Edit
                </button>
              </div>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              <div><dt class="text-xs text-neutral-400">Pelanggan</dt><dd>{{ detail.customer_name || '-' }} <span v-if="detail.customer_phone" class="text-neutral-400">({{ detail.customer_phone }})</span></dd></div>
              <div><dt class="text-xs text-neutral-400">Perangkat</dt><dd>{{ detail.device_model }} <span v-if="detail.model_number" class="text-neutral-400">· {{ detail.model_number }}</span></dd></div>
              <div><dt class="text-xs text-neutral-400">Serial Number</dt><dd class="font-mono">{{ detail.serial_number || '-' }}</dd></div>
              <div><dt class="text-xs text-neutral-400">Warna / Storage</dt><dd>{{ detail.device_color || '-' }} · {{ detail.device_storage || '-' }}</dd></div>
              <div class="sm:col-span-2"><dt class="text-xs text-neutral-400">Keluhan</dt><dd>{{ detail.complaint }}</dd></div>
              <div><dt class="text-xs text-neutral-400">Estimasi Biaya</dt><dd>{{ formatCurrency(detail.estimated_cost) }}</dd></div>
              <div><dt class="text-xs text-neutral-400">Diterima</dt><dd>{{ formatDateTime(detail.received_at) }}</dd></div>
            </dl>
          </div>

          <form v-else @submit.prevent="saveDeviceInfo" class="space-y-2.5">
            <div class="flex items-center justify-between mb-1">
              <h4 class="font-medium text-sm">Edit Info Perangkat</h4>
              <button type="button" class="text-neutral-400 hover:text-neutral-600" @click="editDeviceMode = false"><X :size="16" /></button>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <input v-model="deviceForm.device_model" required placeholder="Model perangkat" class="input text-sm col-span-2" />
              <input v-model="deviceForm.model_number" placeholder="Model number" class="input text-sm" />
              <input v-model="deviceForm.serial_number" placeholder="Serial number" class="input text-sm" />
              <input v-model="deviceForm.device_color" placeholder="Warna" class="input text-sm" />
              <input v-model="deviceForm.device_storage" placeholder="Storage / RAM" class="input text-sm" />
            </div>
            <textarea v-model="deviceForm.complaint" required rows="2" placeholder="Keluhan" class="input text-sm"></textarea>
            <div class="grid grid-cols-2 gap-2">
              <input v-model.number="deviceForm.estimated_cost" type="number" min="0" placeholder="Estimasi biaya" class="input text-sm" />
              <input v-model="deviceForm.checkup_estimate" placeholder="Estimasi pengecekan" class="input text-sm" />
            </div>
            <input v-model="deviceForm.device_password" placeholder="Password baru (kosongkan jika tidak diubah)" class="input text-sm" />
            <div class="flex justify-end gap-2">
              <button type="button" class="btn-secondary text-xs" @click="editDeviceMode = false">Batal</button>
              <button type="submit" class="btn-primary text-xs" :disabled="detailSaving">Simpan</button>
            </div>
          </form>
        </div>

        <!-- Aksi -->
        <div class="flex gap-2">
          <router-link :to="`/service-macbook/${detail.id}/nota`" class="btn-secondary text-xs flex-1"><Printer :size="14" /> Cetak Nota Penerimaan</router-link>
          <button v-if="canDelete" class="btn-danger text-xs flex-1" @click="deleting = detail"><Trash2 :size="14" /> Hapus Tiket</button>
        </div>

        <p v-if="detailError" class="text-sm text-red-500">{{ detailError }}</p>

        <!-- Alur kerja -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
            <h4 class="font-medium text-sm">Diagnosis &amp; Teknisi</h4>
            <textarea v-model="diagnosisForm.diagnosis" rows="2" class="input text-sm" placeholder="Hasil pengecekan / diagnosis..."></textarea>
            <select v-model="diagnosisForm.technician_id" class="input text-sm">
              <option value="">Belum ditugaskan</option>
              <option v-for="t in technicians" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
            <button class="btn-secondary text-xs w-full" :disabled="detailSaving" @click="saveDiagnosis">Simpan Diagnosis</button>
          </div>

          <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3">
            <h4 class="font-medium text-sm">Ubah Status</h4>
            <select v-model="statusForm.status" class="input text-sm">
              <option value="menunggu_pengecekan">Menunggu Pengecekan</option>
              <option value="sedang_dikerjakan">Sedang Dikerjakan</option>
              <option value="menunggu_sparepart">Menunggu Sparepart</option>
              <option value="selesai">Selesai</option>
              <option value="diambil">Sudah Diambil</option>
            </select>
            <input v-if="statusForm.status === 'selesai' || statusForm.status === 'diambil'" v-model.number="statusForm.final_cost" type="number" min="0" class="input text-sm" placeholder="Biaya akhir (Rp)" />
            <input v-model="statusForm.note" class="input text-sm" placeholder="Catatan (opsional)" />
            <button class="btn-primary text-xs w-full" :disabled="detailSaving" @click="saveStatus">Update Status</button>
          </div>
        </div>

        <!-- Sparepart & riwayat -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <h4 class="font-medium text-sm mb-3 flex items-center gap-2"><Wrench :size="15" class="text-brand-500" /> Sparepart Digunakan</h4>
            <div v-if="detail.items?.length" class="space-y-1.5 mb-3 text-sm">
              <div v-for="it in detail.items" :key="it.id" class="flex items-center justify-between gap-2">
                <span class="min-w-0 truncate">{{ it.product_name }} × {{ it.qty }}</span>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-neutral-500">{{ formatCurrency(it.price * it.qty) }}</span>
                  <button v-if="canCreate" class="text-neutral-400 hover:text-red-500" :disabled="detailSaving" @click="removeSparepart(it)">
                    <Trash2 :size="13" />
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="text-xs text-neutral-400 mb-3">Belum ada sparepart digunakan.</p>
            <div class="flex gap-2">
              <select v-model="sparepartForm.product_id" class="input text-sm flex-1 min-w-0">
                <option value="" disabled>Pilih produk</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (stok {{ p.stock_qty }})</option>
              </select>
              <input v-model.number="sparepartForm.qty" type="number" min="1" class="input text-sm w-16 shrink-0" />
              <button class="btn-secondary text-xs shrink-0" :disabled="detailSaving" @click="addSparepart">Tambah</button>
            </div>
          </div>

          <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <h4 class="font-medium text-sm mb-3">Riwayat Status</h4>
            <EmptyState v-if="!detail.history?.length" message="Belum ada riwayat status." />
            <div v-else class="space-y-3 max-h-64 overflow-y-auto">
              <div v-for="h in detail.history" :key="h.id" class="flex gap-3 text-sm">
                <div class="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0"></div>
                <div class="min-w-0">
                  <p class="font-medium"><StatusBadge :status="h.status" /></p>
                  <p class="text-xs text-neutral-400">{{ formatDateTime(h.changed_at) }} · {{ h.changed_by_name || 'Sistem' }}</p>
                  <p v-if="h.note" class="text-xs text-neutral-500 mt-0.5">{{ h.note }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    <ConfirmDialog
      v-if="deleting"
      title="Hapus Tiket Service"
      :message="`Yakin ingin menghapus tiket '${deleting.ticket_no}'? Sparepart yang sudah dipakai akan dikembalikan ke stok. Tindakan ini tidak dapat dibatalkan.`"
      @confirm="confirmDeleteTicket"
      @cancel="deleting = null"
    />

    <ServiceSuccessModal v-if="successServiceId" :service-id="successServiceId" @close="closeSuccessModal" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Moon, Sun, Plus, Pencil, KeyRound, Store, ClipboardList, Trash2, ChevronUp, ChevronDown, Monitor, PackageCheck, Landmark, Camera } from 'lucide-vue-next';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';
import { useStoreSettingsStore } from '../stores/storeSettings';
import Modal from '../components/Modal.vue';
import { ROLE_LABELS, formatDate } from '../lib/format';

const auth = useAuthStore();
const ui = useUiStore();
const storeSettings = useStoreSettingsStore();
const isOwner = computed(() => auth.role === 'owner');
const isOwnerOrAdmin = computed(() => auth.can('owner', 'admin'));

const users = ref([]);
const loadingUsers = ref(false);

const showUserModal = ref(false);
const editingUser = ref(null);
const userForm = ref(emptyUserForm());
const userError = ref('');
const savingUser = ref(false);

function emptyUserForm() {
  return { name: '', email: '', password: '', role: 'kasir', is_active: 1 };
}

async function loadUsers() {
  if (!isOwner.value) return;
  loadingUsers.value = true;
  const { data } = await api.get('/users');
  users.value = data;
  loadingUsers.value = false;
}

function openCreateUser() {
  editingUser.value = null;
  userForm.value = emptyUserForm();
  userError.value = '';
  showUserModal.value = true;
}
function openEditUser(u) {
  editingUser.value = u;
  userForm.value = { name: u.name, email: u.email, password: '', role: u.role, is_active: u.is_active };
  userError.value = '';
  showUserModal.value = true;
}

async function submitUser() {
  savingUser.value = true;
  userError.value = '';
  try {
    if (editingUser.value) {
      await api.put(`/users/${editingUser.value.id}`, userForm.value);
    } else {
      await api.post('/users', userForm.value);
    }
    showUserModal.value = false;
    await loadUsers();
  } catch (err) {
    userError.value = err.response?.data?.error || 'Gagal menyimpan pengguna';
  } finally {
    savingUser.value = false;
  }
}

// Change own profile photo
const photoInput = ref(null);
const photoUploading = ref(false);
const photoError = ref('');

function triggerPhotoInput() {
  photoInput.value?.click();
}

async function onPhotoChange(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  photoUploading.value = true;
  photoError.value = '';
  try {
    const fd = new FormData();
    fd.append('photo', file);
    const { data } = await api.put('/auth/photo', fd);
    auth.updateUser(data);
  } catch (err) {
    photoError.value = err.response?.data?.error || 'Gagal mengunggah foto';
  } finally {
    photoUploading.value = false;
  }
}

// Change own password
const pwForm = ref({ password: '', confirm: '' });
const pwSaving = ref(false);
const pwError = ref('');
const pwSuccess = ref('');

async function changePassword() {
  pwError.value = '';
  pwSuccess.value = '';
  if (pwForm.value.password.length < 6) {
    pwError.value = 'Password minimal 6 karakter';
    return;
  }
  if (pwForm.value.password !== pwForm.value.confirm) {
    pwError.value = 'Konfirmasi password tidak cocok';
    return;
  }
  pwSaving.value = true;
  try {
    await api.put('/auth/password', { password: pwForm.value.password });
    pwSuccess.value = 'Password berhasil diperbarui.';
    pwForm.value = { password: '', confirm: '' };
  } catch (err) {
    pwError.value = err.response?.data?.error || 'Gagal memperbarui password';
  } finally {
    pwSaving.value = false;
  }
}

// Store profile (feeds the printed nota header)
const storeForm = ref(null);
const storeSaving = ref(false);
const storeSuccess = ref('');
const storeError = ref('');

async function loadStore() {
  if (!isOwnerOrAdmin.value) return;
  const { data } = await api.get('/settings/store');
  storeForm.value = data;
}

async function saveStore() {
  storeSaving.value = true;
  storeSuccess.value = '';
  storeError.value = '';
  try {
    const { data } = await api.put('/settings/store', storeForm.value);
    storeForm.value = data;
    storeSettings.refresh();
    storeSuccess.value = 'Profil toko berhasil disimpan.';
  } catch (err) {
    storeError.value = err.response?.data?.error || 'Gagal menyimpan profil toko';
  } finally {
    storeSaving.value = false;
  }
}

// Bank account (nota payment info) — owner only, shown on every printed/digital nota.
const bankSaving = ref(false);
const bankSuccess = ref('');
const bankError = ref('');

async function saveBank() {
  bankSaving.value = true;
  bankSuccess.value = '';
  bankError.value = '';
  try {
    const { data } = await api.put('/settings/bank', {
      bank_name: storeForm.value.bank_name,
      bank_account_number: storeForm.value.bank_account_number,
      bank_account_holder: storeForm.value.bank_account_holder,
    });
    storeForm.value = { ...storeForm.value, ...data };
    bankSuccess.value = 'Rekening berhasil disimpan.';
  } catch (err) {
    bankError.value = err.response?.data?.error || 'Gagal menyimpan rekening';
  } finally {
    bankSaving.value = false;
  }
}

// Default min stock — used to prefill "Stok Minimum" when adding a new Part, so
// staff don't have to type it every time. Each part can still override its own value.
const minStockSaving = ref(false);
const minStockSuccess = ref('');
const minStockError = ref('');

async function saveDefaultMinStock() {
  minStockSaving.value = true;
  minStockSuccess.value = '';
  minStockError.value = '';
  try {
    const { data } = await api.put('/settings/default-min-stock', { default_min_stock: storeForm.value.default_min_stock });
    storeForm.value = { ...storeForm.value, ...data };
    storeSettings.refresh();
    minStockSuccess.value = 'Stok minimum default berhasil disimpan.';
  } catch (err) {
    minStockError.value = err.response?.data?.error || 'Gagal menyimpan stok minimum default';
  } finally {
    minStockSaving.value = false;
  }
}

// Checklist templates — fully user-managed, drives the dynamic checklist on the intake form & nota.
const checklist = ref({ kondisi_fisik: [], kelengkapan: [] });
const newItemLabel = ref({ kondisi_fisik: '', kelengkapan: '' });
const checklistBusy = ref(false);

async function loadChecklist() {
  if (!isOwnerOrAdmin.value) return;
  const { data } = await api.get('/checklist-templates');
  checklist.value = {
    kondisi_fisik: data.filter((t) => t.category === 'kondisi_fisik'),
    kelengkapan: data.filter((t) => t.category === 'kelengkapan'),
  };
}

async function addChecklistItem(category) {
  const label = newItemLabel.value[category].trim();
  if (!label) return;
  checklistBusy.value = true;
  try {
    await api.post('/checklist-templates', { category, label });
    newItemLabel.value[category] = '';
    await loadChecklist();
  } finally {
    checklistBusy.value = false;
  }
}

async function toggleChecklistActive(item) {
  await api.put(`/checklist-templates/${item.id}`, { is_active: item.is_active ? 0 : 1 });
  await loadChecklist();
}

async function renameChecklistItem(item, label) {
  if (!label || label === item.label) return;
  await api.put(`/checklist-templates/${item.id}`, { label });
  await loadChecklist();
}

async function moveChecklistItem(item, direction) {
  checklistBusy.value = true;
  try {
    await api.put(`/checklist-templates/${item.id}/reorder`, { direction });
    await loadChecklist();
  } finally {
    checklistBusy.value = false;
  }
}

async function deleteChecklistItem(item) {
  await api.delete(`/checklist-templates/${item.id}`);
  await loadChecklist();
}

onMounted(() => {
  loadUsers();
  loadStore();
  loadChecklist();
});
</script>

<template>
  <div class="pt-2 max-w-5xl">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Pengaturan</h1>
      <p class="text-sm text-neutral-500">Kelola profil, tampilan, dan pengguna toko.</p>
    </div>

    <div class="card p-5 mb-4">
      <h3 class="font-semibold mb-4">Profil Saya</h3>
      <div class="flex items-center gap-4 mb-5">
        <button type="button" class="relative w-14 h-14 rounded-full shrink-0 group" title="Ganti foto profil" @click="triggerPhotoInput">
          <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" class="w-14 h-14 rounded-full object-cover" />
          <div v-else class="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-lg font-semibold text-white">
            {{ auth.initials }}
          </div>
          <span class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
            <Camera :size="16" />
          </span>
        </button>
        <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="onPhotoChange" />
        <div>
          <p class="font-medium">{{ auth.user?.name }}</p>
          <p class="text-sm text-neutral-500">{{ auth.user?.email }} · {{ ROLE_LABELS[auth.role] }}</p>
          <button type="button" class="text-xs font-medium text-brand-500 hover:underline mt-1" :disabled="photoUploading" @click="triggerPhotoInput">
            {{ photoUploading ? 'Mengunggah...' : 'Ganti Foto Profil' }}
          </button>
        </div>
      </div>
      <p v-if="photoError" class="text-sm text-red-500 mb-3">{{ photoError }}</p>

      <h4 class="text-sm font-medium mb-3">Ubah Password</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
        <input v-model="pwForm.password" type="password" placeholder="Password baru" class="input" />
        <input v-model="pwForm.confirm" type="password" placeholder="Konfirmasi password" class="input" />
      </div>
      <p v-if="pwError" class="text-sm text-red-500 mt-2">{{ pwError }}</p>
      <p v-if="pwSuccess" class="text-sm text-emerald-600 mt-2">{{ pwSuccess }}</p>
      <button class="btn-primary mt-3" :disabled="pwSaving" @click="changePassword"><KeyRound :size="15" /> Perbarui Password</button>
    </div>

    <div class="card p-5 mb-4">
      <h3 class="font-semibold mb-4">Tampilan</h3>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">Mode Gelap</p>
          <p class="text-xs text-neutral-500">Sesuaikan tampilan sesuai preferensi Anda.</p>
        </div>
        <button @click="ui.toggleTheme()" class="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-brand-500">
          <Moon v-if="!ui.dark" :size="18" />
          <Sun v-else :size="18" />
        </button>
      </div>
    </div>

    <div v-if="isOwnerOrAdmin && storeForm" class="card p-5 mb-4">
      <h3 class="font-semibold mb-1 flex items-center gap-2"><Store :size="17" class="text-brand-500" /> Profil Toko</h3>
      <p class="text-xs text-neutral-500 mb-4">Muncul di header &amp; footer Nota Penerimaan Service.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="label">Nama Toko</label>
          <input v-model="storeForm.store_name" class="input" />
        </div>
        <div>
          <label class="label">Tagline</label>
          <input v-model="storeForm.tagline" class="input" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Alamat</label>
          <input v-model="storeForm.address" class="input" />
        </div>
        <div>
          <label class="label">Telepon</label>
          <input v-model="storeForm.phone" class="input" />
        </div>
        <div>
          <label class="label">Website</label>
          <input v-model="storeForm.website" class="input" />
        </div>
        <div>
          <label class="label">Instagram</label>
          <input v-model="storeForm.instagram" class="input" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Catatan Penting (satu baris per poin, tampil di nota)</label>
          <textarea v-model="storeForm.intake_notice" rows="4" class="input"></textarea>
        </div>
        <div class="sm:col-span-2">
          <label class="label">Teks Persetujuan Pengecekan</label>
          <textarea v-model="storeForm.consent_text" rows="2" class="input"></textarea>
        </div>
      </div>
      <p v-if="storeError" class="text-sm text-red-500 mt-3">{{ storeError }}</p>
      <p v-if="storeSuccess" class="text-sm text-emerald-600 mt-3">{{ storeSuccess }}</p>
      <button class="btn-primary mt-4" :disabled="storeSaving" @click="saveStore">Simpan Profil Toko</button>
    </div>

    <div v-if="isOwner && storeForm" class="card p-5 mb-4">
      <h3 class="font-semibold mb-1 flex items-center gap-2"><Landmark :size="17" class="text-brand-500" /> Rekening Pembayaran</h3>
      <p class="text-xs text-neutral-500 mb-4">Tampil di semua nota — penjualan &amp; service (thermal, PDF, dan WhatsApp).</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="label">Nama Bank</label>
          <input v-model="storeForm.bank_name" placeholder="cth. BCA" class="input" />
        </div>
        <div>
          <label class="label">Nomor Rekening</label>
          <input v-model="storeForm.bank_account_number" placeholder="cth. 1234567890" class="input" />
        </div>
        <div class="sm:col-span-2">
          <label class="label">Atas Nama</label>
          <input v-model="storeForm.bank_account_holder" placeholder="cth. Arif Wijaya" class="input" />
        </div>
      </div>
      <p v-if="bankError" class="text-sm text-red-500 mt-3">{{ bankError }}</p>
      <p v-if="bankSuccess" class="text-sm text-emerald-600 mt-3">{{ bankSuccess }}</p>
      <button class="btn-primary mt-4" :disabled="bankSaving" @click="saveBank">Simpan Rekening</button>
    </div>

    <div v-if="isOwnerOrAdmin && storeForm" class="card p-5 mb-4">
      <h3 class="font-semibold mb-1 flex items-center gap-2"><PackageCheck :size="17" class="text-brand-500" /> Stok Minimum Default</h3>
      <p class="text-xs text-neutral-500 mb-4">Dipakai sebagai isian awal "Stok Minimum" saat menambah Part baru — tiap part tetap bisa diubah sendiri nilainya.</p>
      <div class="max-w-xs">
        <label class="label">Stok Minimum Default</label>
        <input v-model.number="storeForm.default_min_stock" type="number" min="0" class="input" />
      </div>
      <p v-if="minStockError" class="text-sm text-red-500 mt-3">{{ minStockError }}</p>
      <p v-if="minStockSuccess" class="text-sm text-emerald-600 mt-3">{{ minStockSuccess }}</p>
      <button class="btn-primary mt-4" :disabled="minStockSaving" @click="saveDefaultMinStock">Simpan</button>
    </div>

    <div v-if="isOwnerOrAdmin" class="card p-5 mb-4">
      <h3 class="font-semibold mb-1 flex items-center gap-2"><ClipboardList :size="17" class="text-brand-500" /> Checklist Kondisi &amp; Kelengkapan</h3>
      <p class="text-xs text-neutral-500 mb-4">Atur sendiri daftar item checklist pada nota penerimaan service — tambah, ubah, nonaktifkan, hapus, atau urutkan sesuai kebutuhan toko Anda.</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div v-for="category in ['kondisi_fisik', 'kelengkapan']" :key="category">
          <h4 class="flex items-center gap-2 text-xs font-semibold text-neutral-500 uppercase mb-3">
            <component :is="category === 'kondisi_fisik' ? Monitor : PackageCheck" :size="14" />
            {{ category === 'kondisi_fisik' ? 'Kondisi Fisik' : 'Kelengkapan' }}
          </h4>
          <div class="space-y-1 mb-3">
            <div v-for="(item, i) in checklist[category]" :key="item.id" class="flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
              <div class="flex flex-col shrink-0">
                <button type="button" class="text-neutral-400 hover:text-brand-500 disabled:opacity-30" :disabled="i === 0 || checklistBusy" @click="moveChecklistItem(item, 'up')"><ChevronUp :size="13" /></button>
                <button type="button" class="text-neutral-400 hover:text-brand-500 disabled:opacity-30" :disabled="i === checklist[category].length - 1 || checklistBusy" @click="moveChecklistItem(item, 'down')"><ChevronDown :size="13" /></button>
              </div>
              <input
                :value="item.label"
                class="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-brand-400 focus:outline-none py-0.5"
                :class="!item.is_active && 'text-neutral-400 line-through'"
                @change="renameChecklistItem(item, $event.target.value)"
              />
              <button type="button" class="badge shrink-0" :class="item.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'" @click="toggleChecklistActive(item)">
                {{ item.is_active ? 'Aktif' : 'Nonaktif' }}
              </button>
              <button type="button" class="text-red-400 hover:text-red-500 shrink-0" @click="deleteChecklistItem(item)"><Trash2 :size="14" /></button>
            </div>
            <p v-if="!checklist[category].length" class="text-xs text-neutral-400 px-2">Belum ada item.</p>
          </div>
          <form class="flex gap-2" @submit.prevent="addChecklistItem(category)">
            <input v-model="newItemLabel[category]" class="input text-sm" placeholder="Tambah item baru..." />
            <button type="submit" class="btn-secondary text-xs shrink-0" :disabled="checklistBusy"><Plus :size="14" /></button>
          </form>
        </div>
      </div>
    </div>

    <div v-if="isOwner" class="card p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold">Manajemen Pengguna</h3>
        <button class="btn-primary" @click="openCreateUser"><Plus :size="15" /> Tambah Pengguna</button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Nama</th>
              <th class="px-2 py-2 font-medium">Email</th>
              <th class="px-2 py-2 font-medium">Role</th>
              <th class="px-2 py-2 font-medium">Status</th>
              <th class="px-2 py-2 font-medium">Bergabung</th>
              <th class="px-2 py-2 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-2.5 font-medium">{{ u.name }}</td>
              <td class="px-2 py-2.5 text-neutral-500">{{ u.email }}</td>
              <td class="px-2 py-2.5 capitalize">{{ ROLE_LABELS[u.role] }}</td>
              <td class="px-2 py-2.5">
                <span class="badge" :class="u.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-500'">
                  {{ u.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="px-2 py-2.5 text-neutral-500">{{ formatDate(u.created_at) }}</td>
              <td class="px-2 py-2.5 text-right">
                <button class="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" @click="openEditUser(u)"><Pencil :size="15" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showUserModal" :title="editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'" @close="showUserModal = false">
      <form @submit.prevent="submitUser" class="space-y-4">
        <div>
          <label class="label">Nama</label>
          <input v-model="userForm.name" required class="input" />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="userForm.email" type="email" required :disabled="!!editingUser" class="input" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Role</label>
            <select v-model="userForm.role" class="input">
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="kasir">Kasir</option>
              <option value="teknisi">Teknisi</option>
            </select>
          </div>
          <div v-if="editingUser">
            <label class="label">Status</label>
            <select v-model="userForm.is_active" class="input">
              <option :value="1">Aktif</option>
              <option :value="0">Nonaktif</option>
            </select>
          </div>
        </div>
        <div>
          <label class="label">{{ editingUser ? 'Reset Password (opsional)' : 'Password' }}</label>
          <input v-model="userForm.password" type="password" :required="!editingUser" class="input" />
        </div>

        <p v-if="userError" class="text-sm text-red-500">{{ userError }}</p>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="showUserModal = false">Batal</button>
          <button type="submit" class="btn-primary" :disabled="savingUser">Simpan</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

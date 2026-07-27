<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Plus, Search, Trash2, Minus, ShoppingCart, Eye, Receipt } from 'lucide-vue-next';
import api from '../lib/api';
import Modal from '../components/Modal.vue';
import StatusBadge from '../components/StatusBadge.vue';
import EmptyState from '../components/EmptyState.vue';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import SaleSuccessModal from '../components/SaleSuccessModal.vue';
import { formatCurrency, formatDateTime } from '../lib/format';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const canDelete = computed(() => auth.can('owner'));
const deleting = ref(null);

const sales = ref([]);
const loading = ref(true);
const search = ref('');

const showPos = ref(false);
const showDetail = ref(false);
const detail = ref(null);

const products = ref([]);
const customers = ref([]);
const productSearch = ref('');
const cart = ref([]);
const customerId = ref('');
const discount = ref(0);
const paymentMethod = ref('tunai');
const saving = ref(false);
const error = ref('');
const successSaleId = ref(null);

async function loadSales() {
  loading.value = true;
  const { data } = await api.get('/sales', { params: { search: search.value } });
  sales.value = data;
  loading.value = false;
}
let searchTimer;
function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadSales, 300);
}

const filteredProducts = computed(() => {
  const q = productSearch.value.toLowerCase();
  return products.value.filter((p) => p.stock_qty > 0 && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))).slice(0, 8);
});

function addToCart(p) {
  const existing = cart.value.find((c) => c.product_id === p.id);
  if (existing) {
    if (existing.qty < p.stock_qty) existing.qty++;
  } else {
    cart.value.push({ product_id: p.id, name: p.name, sku: p.sku, price: Number(p.sell_price), qty: 1, maxStock: p.stock_qty });
  }
  productSearch.value = '';
}
function removeFromCart(i) {
  cart.value.splice(i, 1);
}
function incQty(item) {
  if (item.qty < item.maxStock) item.qty++;
}
function decQty(item, i) {
  if (item.qty > 1) item.qty--;
  else removeFromCart(i);
}

const subtotal = computed(() => cart.value.reduce((sum, c) => sum + c.price * c.qty, 0));
const total = computed(() => Math.max(subtotal.value - Number(discount.value || 0), 0));

function resetPos() {
  cart.value = [];
  customerId.value = '';
  discount.value = 0;
  paymentMethod.value = 'tunai';
  error.value = '';
}

async function openPos() {
  resetPos();
  const [p, c] = await Promise.all([api.get('/products'), api.get('/customers')]);
  products.value = p.data;
  customers.value = c.data;
  showPos.value = true;
}

function openNota(id) {
  router.push({ name: 'penjualan-nota', params: { id } });
}

async function submitSale() {
  if (!cart.value.length) return;
  error.value = '';
  saving.value = true;
  try {
    const { data } = await api.post('/sales', {
      customer_id: customerId.value || null,
      items: cart.value.map((c) => ({ product_id: c.product_id, qty: c.qty, price: c.price })),
      discount: Number(discount.value || 0),
      payment_method: paymentMethod.value,
      status: 'lunas',
    });
    showPos.value = false;
    successSaleId.value = data.id;
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal membuat transaksi';
  } finally {
    saving.value = false;
  }
}

function closeSuccessModal() {
  successSaleId.value = null;
  loadSales();
}

async function openDetail(sale) {
  const { data } = await api.get(`/sales/${sale.id}`);
  detail.value = data;
  showDetail.value = true;
}

async function confirmDelete() {
  await api.delete(`/sales/${deleting.value.id}`);
  deleting.value = null;
  showDetail.value = false;
  await loadSales();
}

onMounted(loadSales);
</script>

<template>
  <div class="pt-2">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold">Penjualan</h1>
        <p class="text-sm text-neutral-500">Buat transaksi baru dan pantau riwayat penjualan.</p>
      </div>
      <button class="btn-primary" @click="openPos"><Plus :size="16" /> Transaksi Baru</button>
    </div>

    <div class="card p-4 mb-4">
      <div class="relative max-w-md">
        <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input v-model="search" @input="onSearchInput" class="input !pl-9" placeholder="Cari invoice atau nama pelanggan..." />
      </div>
    </div>

    <div class="card p-5">
      <EmptyState v-if="!loading && !sales.length" message="Belum ada transaksi penjualan." />
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-neutral-400 text-xs uppercase">
              <th class="px-2 py-2 font-medium">Invoice</th>
              <th class="px-2 py-2 font-medium">Tanggal</th>
              <th class="px-2 py-2 font-medium">Pelanggan</th>
              <th class="px-2 py-2 font-medium text-right">Total</th>
              <th class="px-2 py-2 font-medium">Status</th>
              <th class="px-2 py-2 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sales" :key="s.id" class="border-t border-neutral-100 dark:border-neutral-800">
              <td class="px-2 py-3 font-medium">{{ s.invoice_no }}</td>
              <td class="px-2 py-3 text-neutral-500">{{ formatDateTime(s.created_at) }}</td>
              <td class="px-2 py-3 text-neutral-500">{{ s.customer_name || 'Tanpa nama' }}</td>
              <td class="px-2 py-3 text-right font-medium">{{ formatCurrency(s.total) }}</td>
              <td class="px-2 py-3"><StatusBadge :status="s.status" /></td>
              <td class="px-2 py-3 text-right">
                <button class="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" @click="openDetail(s)" title="Detail"><Eye :size="15" /></button>
                <button class="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500" @click="openNota(s.id)" title="Cetak / Kirim Nota"><Receipt :size="15" /></button>
                <button v-if="canDelete" class="w-8 h-8 rounded-lg inline-flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950 text-red-500" @click="deleting = s"><Trash2 :size="15" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- POS Modal -->
    <Modal v-if="showPos" title="Transaksi Baru" size="xl" @close="showPos = false">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="label">Cari Produk</label>
          <div class="relative mb-3">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input v-model="productSearch" class="input !pl-9" placeholder="Ketik nama atau SKU..." />
          </div>
          <div class="space-y-1 max-h-72 overflow-y-auto">
            <button
              v-for="p in filteredProducts"
              :key="p.id"
              type="button"
              class="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
              @click="addToCart(p)"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ p.name }}</p>
                <p class="text-xs text-neutral-400">Stok: {{ p.stock_qty }}</p>
              </div>
              <span class="text-sm font-medium shrink-0 ml-2">{{ formatCurrency(p.sell_price) }}</span>
            </button>
            <p v-if="productSearch && !filteredProducts.length" class="text-sm text-neutral-400 py-3">Produk tidak ditemukan.</p>
          </div>
        </div>

        <div>
          <div class="flex items-center gap-2 mb-3">
            <ShoppingCart :size="16" class="text-brand-500" />
            <h4 class="font-medium text-sm">Keranjang ({{ cart.length }})</h4>
          </div>
          <EmptyState v-if="!cart.length" message="Belum ada produk di keranjang." />
          <div v-else class="space-y-2 max-h-56 overflow-y-auto mb-4">
            <div v-for="(item, i) in cart" :key="item.product_id" class="flex items-center gap-2 text-sm">
              <div class="min-w-0 flex-1">
                <p class="font-medium truncate">{{ item.name }}</p>
                <p class="text-xs text-neutral-400">{{ formatCurrency(item.price) }}</p>
              </div>
              <button type="button" class="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center" @click="decQty(item, i)"><Minus :size="12" /></button>
              <span class="w-6 text-center">{{ item.qty }}</span>
              <button type="button" class="w-6 h-6 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center" @click="incQty(item)"><Plus :size="12" /></button>
              <button type="button" class="w-7 h-7 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950" @click="removeFromCart(i)"><Trash2 :size="14" /></button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="label">Pelanggan</label>
              <select v-model="customerId" class="input">
                <option value="">Tanpa pelanggan</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="label">Pembayaran</label>
              <select v-model="paymentMethod" class="input">
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
                <option value="kartu">Kartu</option>
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label class="label">Diskon (Rp)</label>
            <input v-model.number="discount" type="number" min="0" class="input" />
          </div>

          <div class="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-1 text-sm mb-4">
            <div class="flex justify-between text-neutral-500"><span>Subtotal</span><span>{{ formatCurrency(subtotal) }}</span></div>
            <div class="flex justify-between text-neutral-500"><span>Diskon</span><span>-{{ formatCurrency(discount) }}</span></div>
            <div class="flex justify-between font-semibold text-base"><span>Total</span><span>{{ formatCurrency(total) }}</span></div>
          </div>

          <p v-if="error" class="text-sm text-red-500 mb-3">{{ error }}</p>
          <button class="btn-primary w-full" :disabled="!cart.length || saving" @click="submitSale">Selesaikan Transaksi</button>
        </div>
      </div>
    </Modal>

    <!-- Detail Modal -->
    <Modal v-if="showDetail && detail" :title="`Detail ${detail.invoice_no}`" @close="showDetail = false">
      <div class="text-sm space-y-1 mb-4">
        <p><span class="text-neutral-500">Pelanggan:</span> {{ detail.customer_name || 'Tanpa nama' }}</p>
        <p><span class="text-neutral-500">Tanggal:</span> {{ formatDateTime(detail.created_at) }}</p>
        <p><span class="text-neutral-500">Pembayaran:</span> {{ detail.payment_method }}</p>
      </div>
      <table class="w-full text-sm mb-4">
        <thead>
          <tr class="text-left text-neutral-400 text-xs uppercase">
            <th class="py-1 font-medium">Produk</th>
            <th class="py-1 font-medium text-right">Qty</th>
            <th class="py-1 font-medium text-right">Harga</th>
            <th class="py-1 font-medium text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in detail.items" :key="it.id" class="border-t border-neutral-100 dark:border-neutral-800">
            <td class="py-2">{{ it.product_name }}</td>
            <td class="py-2 text-right">{{ it.qty }}</td>
            <td class="py-2 text-right">{{ formatCurrency(it.price) }}</td>
            <td class="py-2 text-right">{{ formatCurrency(it.subtotal) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-1 text-sm">
        <div class="flex justify-between text-neutral-500"><span>Subtotal</span><span>{{ formatCurrency(detail.subtotal) }}</span></div>
        <div class="flex justify-between text-neutral-500"><span>Diskon</span><span>-{{ formatCurrency(detail.discount) }}</span></div>
        <div class="flex justify-between font-semibold text-base"><span>Total</span><span>{{ formatCurrency(detail.total) }}</span></div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button v-if="canDelete" class="btn-danger" @click="deleting = detail"><Trash2 :size="15" /> Hapus Transaksi</button>
        <button class="btn-primary" @click="openNota(detail.id)"><Receipt :size="15" /> Cetak / Kirim Nota</button>
      </div>
    </Modal>

    <ConfirmDialog
      v-if="deleting"
      title="Hapus Transaksi"
      :message="`Yakin ingin menghapus transaksi '${deleting.invoice_no}'? Stok produk terkait akan dikembalikan.`"
      @confirm="confirmDelete"
      @cancel="deleting = null"
    />

    <SaleSuccessModal v-if="successSaleId" :sale-id="successSaleId" @close="closeSuccessModal" />
  </div>
</template>

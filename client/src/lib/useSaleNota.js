import { ref } from 'vue';
import QRCode from 'qrcode';
import api from './api';

// Shared fetch logic for anywhere a sale's printable nota is rendered
// (full nota page, post-checkout quick-action modal, etc).
export function useSaleNota() {
  const sale = ref(null);
  const store = ref(null);
  const qrDataUrl = ref('');
  const loading = ref(true);

  async function load(saleId) {
    loading.value = true;
    const [saleRes, storeRes] = await Promise.all([api.get(`/sales/${saleId}`), api.get('/settings/store')]);
    sale.value = saleRes.data;
    store.value = storeRes.data;

    const qrTarget = store.value.website || (store.value.instagram ? `https://instagram.com/${store.value.instagram.replace(/^@/, '')}` : '');
    if (qrTarget) {
      qrDataUrl.value = await QRCode.toDataURL(qrTarget, { width: 160, margin: 1, color: { dark: '#171717', light: '#ffffff' } });
    }
    loading.value = false;
  }

  return { sale, store, qrDataUrl, loading, load };
}

import { ref } from 'vue';
import QRCode from 'qrcode';
import api from './api';

// Shared fetch logic for anywhere a service ticket's printable nota is rendered
// (full nota page, post-intake quick-action modal, etc).
export function useServiceNota() {
  const service = ref(null);
  const store = ref(null);
  const qrDataUrl = ref('');
  const checkUrl = ref('');
  const loading = ref(true);

  async function load(serviceId) {
    loading.value = true;
    const [svcRes, storeRes] = await Promise.all([api.get(`/services/${serviceId}`), api.get('/settings/store')]);
    service.value = svcRes.data;
    store.value = storeRes.data;

    checkUrl.value = `${window.location.origin}/cek-service/${service.value.ticket_no}`;
    qrDataUrl.value = await QRCode.toDataURL(checkUrl.value, { width: 180, margin: 1, color: { dark: '#171717', light: '#ffffff' } });
    loading.value = false;
  }

  return { service, store, qrDataUrl, checkUrl, loading, load };
}

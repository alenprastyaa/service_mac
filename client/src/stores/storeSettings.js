import { defineStore } from 'pinia';
import api from '../lib/api';

// Shared store profile (name, address, bank info, etc.) — fetched once and reused
// wherever it's needed (Topbar address, nota headers, Pengaturan form).
export const useStoreSettingsStore = defineStore('storeSettings', {
  state: () => ({ data: null, loaded: false }),
  actions: {
    async fetch() {
      if (this.loaded) return;
      await this.refresh();
    },
    async refresh() {
      const { data } = await api.get('/settings/store');
      this.data = data;
      this.loaded = true;
    },
  },
});

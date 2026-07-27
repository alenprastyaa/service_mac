import { defineStore } from 'pinia';
import api from '../lib/api';

const POLL_INTERVAL_MS = 15000;

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    items: [],
    unreadCount: 0,
    loaded: false,
    pollHandle: null,
  }),
  actions: {
    async fetchAll() {
      const { data } = await api.get('/notifications');
      this.items = data;
      this.unreadCount = data.filter((n) => !n.is_read).length;
      this.loaded = true;
    },
    async fetchUnreadCount() {
      const { data } = await api.get('/notifications/unread-count');
      this.unreadCount = data.count;
    },
    async markRead(id) {
      const item = this.items.find((n) => n.id === id);
      if (!item || item.is_read) return;
      item.is_read = 1;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      await api.put(`/notifications/${id}/read`);
    },
    async markAllRead() {
      if (!this.unreadCount && this.items.every((n) => n.is_read)) return;
      this.items.forEach((n) => (n.is_read = 1));
      this.unreadCount = 0;
      await api.put('/notifications/read-all');
    },
    startPolling() {
      if (this.pollHandle) return;
      this.fetchUnreadCount();
      this.pollHandle = setInterval(() => this.fetchUnreadCount(), POLL_INTERVAL_MS);
    },
    stopPolling() {
      if (!this.pollHandle) return;
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    },
  },
});

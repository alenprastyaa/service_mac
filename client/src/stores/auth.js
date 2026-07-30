import { defineStore } from 'pinia';
import api from '../lib/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('oren_token') || null,
    user: JSON.parse(localStorage.getItem('oren_user') || 'null'),
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    role: (state) => state.user?.role,
    initials: (state) => (state.user?.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(),
  },
  actions: {
    async login(email, password) {
      const { data } = await api.post('/auth/login', { email, password });
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('oren_token', data.token);
      localStorage.setItem('oren_user', JSON.stringify(data.user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('oren_token');
      localStorage.removeItem('oren_user');
    },
    updateUser(partial) {
      this.user = { ...this.user, ...partial };
      localStorage.setItem('oren_user', JSON.stringify(this.user));
    },
    can(...roles) {
      return this.user && roles.includes(this.user.role);
    },
  },
});

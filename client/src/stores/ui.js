import { defineStore } from 'pinia';

export const useUiStore = defineStore('ui', {
  state: () => ({
    dark: localStorage.getItem('oren_theme') === 'dark',
    sidebarOpen: false,
  }),
  actions: {
    applyTheme() {
      document.documentElement.classList.toggle('dark', this.dark);
    },
    toggleTheme() {
      this.dark = !this.dark;
      localStorage.setItem('oren_theme', this.dark ? 'dark' : 'light');
      this.applyTheme();
    },
  },
});

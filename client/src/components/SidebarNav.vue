<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  LayoutGrid, Laptop, PackageSearch, PackagePlus, ShoppingCart, Laptop2, Users, Truck, BarChart3, Settings, ChevronRight, X,
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useUiStore } from '../stores/ui';
import logo from '../assets/logo.png';

const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();

const allItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/stock-macbook', label: 'Stock MacBook', icon: Laptop, roles: ['owner', 'admin', 'kasir'] },
  { to: '/part-macbook', label: 'Part MacBook', icon: PackageSearch, roles: ['owner', 'admin', 'kasir'] },
  { to: '/barang-masuk', label: 'Barang Masuk', icon: PackagePlus, roles: ['owner', 'admin', 'kasir'] },
  { to: '/penjualan', label: 'Penjualan', icon: ShoppingCart, roles: ['owner', 'admin', 'kasir'] },
  { to: '/service-macbook', label: 'Service MacBook', icon: Laptop2, roles: ['owner', 'admin', 'kasir', 'teknisi'] },
  { to: '/pelanggan', label: 'Pelanggan', icon: Users },
  { to: '/supplier', label: 'Supplier', icon: Truck, roles: ['owner', 'admin'] },
  { to: '/laporan', label: 'Laporan', icon: BarChart3, roles: ['owner', 'admin'] },
  { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
];

const items = computed(() => allItems.filter((item) => !item.roles || item.roles.includes(auth.role)));
const isActive = (to) => route.path === to;
</script>

<template>
  <aside
    class="w-64 shrink-0 bg-white text-neutral-600 flex flex-col h-screen border-r border-neutral-200 fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:sticky lg:top-0 lg:translate-x-0"
    :class="ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="px-5 py-5 flex items-center justify-between">
      <img :src="logo" alt="Oren MacStore" class="h-24 w-auto object-contain" />
      <button class="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 shrink-0" @click="ui.closeSidebar()">
        <X :size="18" />
      </button>
    </div>

    <nav class="flex-1 px-3 space-y-1 overflow-y-auto">
      <router-link
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
        :class="isActive(item.to) ? 'bg-brand-500 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-ink-900'"
      >
        <component :is="item.icon" :size="18" />
        {{ item.label }}
      </router-link>
    </nav>

    <router-link to="/pengaturan" class="px-4 py-4 border-t border-neutral-200 flex items-center gap-3 hover:bg-neutral-100 transition-colors">
      <div class="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-xs font-semibold text-white shrink-0">
        {{ auth.initials }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-ink-900 truncate">{{ auth.user?.name }}</p>
        <p class="text-xs text-neutral-500 capitalize">{{ auth.user?.role }}</p>
      </div>
      <ChevronRight :size="16" class="text-neutral-400 shrink-0" />
    </router-link>
  </aside>
</template>

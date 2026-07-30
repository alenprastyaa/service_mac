<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Bell, Moon, Sun, LogOut, UserCog, ShoppingCart, Wrench, Menu } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import { useStoreSettingsStore } from '../stores/storeSettings';
import { formatTimeAgo } from '../lib/format';

const ui = useUiStore();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const storeSettings = useStoreSettingsStore();
const router = useRouter();

const menuOpen = ref(false);
const menuRef = ref(null);
const notifOpen = ref(false);
const notifRef = ref(null);

function onClickOutside(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) menuOpen.value = false;
  if (notifRef.value && !notifRef.value.contains(e.target)) notifOpen.value = false;
}
onMounted(() => {
  document.addEventListener('click', onClickOutside);
  notifications.startPolling();
  storeSettings.fetch();
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside);
  notifications.stopPolling();
});

function toggleNotif() {
  notifOpen.value = !notifOpen.value;
  if (notifOpen.value) notifications.fetchAll();
}

function openNotif(n) {
  notifications.markRead(n.id);
  notifOpen.value = false;
  if (n.ref_type === 'sale') router.push('/penjualan');
  else if (n.ref_type === 'service') router.push('/service-macbook');
}

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="sticky top-0 z-10 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
    <button class="lg:hidden w-10 h-10 shrink-0 rounded-full bg-white dark:bg-neutral-900 shadow-card flex items-center justify-center text-neutral-500 hover:text-brand-500 transition-colors" title="Menu" @click="ui.toggleSidebar()">
      <Menu :size="18" />
    </button>

    <div class="relative flex-1 max-w-xl hidden sm:block">
      <Search :size="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input type="text" placeholder="Cari produk, pelanggan, invoice..." class="input !pl-10 bg-white dark:bg-neutral-900 shadow-card border-neutral-100 dark:border-neutral-800" />
    </div>
    <div class="flex-1 sm:hidden"></div>

    <div class="flex items-center gap-2 shrink-0">
      <div class="relative" ref="notifRef">
        <button @click="toggleNotif" class="relative w-10 h-10 rounded-full bg-white dark:bg-neutral-900 shadow-card flex items-center justify-center text-neutral-500 hover:text-brand-500 transition-colors" title="Notifikasi">
          <Bell :size="18" />
          <span v-if="notifications.unreadCount > 0" class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center">
            {{ notifications.unreadCount > 9 ? '9+' : notifications.unreadCount }}
          </span>
        </button>

        <div v-if="notifOpen" class="absolute right-0 mt-2 w-80 card p-0 text-sm overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <p class="font-medium">Notifikasi</p>
            <button v-if="notifications.unreadCount > 0" @click="notifications.markAllRead()" class="text-xs text-brand-500 hover:underline">
              Tandai semua dibaca
            </button>
          </div>
          <div class="max-h-96 overflow-y-auto">
            <p v-if="!notifications.items.length" class="px-4 py-6 text-center text-neutral-400 text-xs">
              Belum ada notifikasi
            </p>
            <button
              v-for="n in notifications.items"
              :key="n.id"
              @click="openNotif(n)"
              class="w-full flex items-start gap-3 px-4 py-3 text-left border-b border-neutral-50 dark:border-neutral-800/50 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              :class="!n.is_read && 'bg-brand-50/50 dark:bg-brand-500/5'"
            >
              <span class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                :class="n.type === 'sale' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10' : 'bg-sky-100 text-sky-600 dark:bg-sky-500/10'">
                <ShoppingCart v-if="n.type === 'sale'" :size="15" />
                <Wrench v-else :size="15" />
              </span>
              <span class="flex-1 min-w-0">
                <span class="flex items-center gap-1.5">
                  <span class="font-medium truncate">{{ n.title }}</span>
                  <span v-if="!n.is_read" class="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0"></span>
                </span>
                <span class="block text-neutral-500 truncate">{{ n.message }}</span>
                <span class="block text-neutral-400 text-xs mt-0.5">{{ formatTimeAgo(n.created_at) }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <button @click="ui.toggleTheme()" class="w-10 h-10 rounded-full bg-white dark:bg-neutral-900 shadow-card flex items-center justify-center text-neutral-500 hover:text-brand-500 transition-colors" title="Mode gelap">
        <Moon v-if="!ui.dark" :size="18" />
        <Sun v-else :size="18" />
      </button>

      <div class="relative" ref="menuRef">
        <button @click="menuOpen = !menuOpen" class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-xs font-semibold text-white">
          {{ auth.initials }}
        </button>
        <div v-if="menuOpen" class="absolute right-0 mt-2 w-52 card p-2 text-sm">
          <div class="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 mb-1">
            <p class="font-medium truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-neutral-500 capitalize">{{ auth.user?.role }}</p>
          </div>
          <router-link to="/pengaturan" @click="menuOpen = false" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <UserCog :size="16" /> Pengaturan
          </router-link>
          <button @click="logout" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-red-600">
            <LogOut :size="16" /> Keluar
          </button>
        </div>
      </div>

      <p v-if="storeSettings.data?.address" class="hidden lg:block text-sm text-neutral-500 dark:text-neutral-400 max-w-xs leading-snug line-clamp-2" :title="storeSettings.data.address">
        {{ storeSettings.data.address }}
      </p>
    </div>
  </header>
</template>

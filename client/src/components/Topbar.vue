<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Bell, Moon, Sun, LogOut, UserCog } from 'lucide-vue-next';
import { useUiStore } from '../stores/ui';
import { useAuthStore } from '../stores/auth';

const ui = useUiStore();
const auth = useAuthStore();
const router = useRouter();

const menuOpen = ref(false);
const menuRef = ref(null);

function onClickOutside(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) menuOpen.value = false;
}
onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <header class="sticky top-0 z-10 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur px-6 py-4 flex items-center gap-4">
    <div class="relative flex-1 max-w-xl">
      <Search :size="18" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input type="text" placeholder="Cari produk, pelanggan, invoice..." class="input !pl-10 bg-white dark:bg-neutral-900 shadow-card border-neutral-100 dark:border-neutral-800" />
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <button class="relative w-10 h-10 rounded-full bg-white dark:bg-neutral-900 shadow-card flex items-center justify-center text-neutral-500 hover:text-brand-500 transition-colors" title="Notifikasi">
        <Bell :size="18" />
        <span class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center">3</span>
      </button>

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
    </div>
  </header>
</template>

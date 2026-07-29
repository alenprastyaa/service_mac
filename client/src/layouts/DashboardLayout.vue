<script setup>
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import SidebarNav from '../components/SidebarNav.vue';
import Topbar from '../components/Topbar.vue';
import { useUiStore } from '../stores/ui';

const ui = useUiStore();
const route = useRoute();

watch(() => route.fullPath, () => ui.closeSidebar());
</script>

<template>
  <div class="flex min-h-screen">
    <SidebarNav />
    <div
      v-if="ui.sidebarOpen"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      @click="ui.closeSidebar()"
    ></div>
    <div class="flex-1 min-w-0">
      <Topbar />
      <main class="px-4 sm:px-6 pb-10">
        <router-view />
      </main>
    </div>
  </div>
</template>

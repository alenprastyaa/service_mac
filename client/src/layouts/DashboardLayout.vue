<script setup>
import SidebarNav from '../components/SidebarNav.vue';
import Topbar from '../components/Topbar.vue';
</script>

<template>
  <div class="flex min-h-screen">
    <SidebarNav />
    <div class="flex-1 min-w-0">
      <Topbar />
      <main class="px-6 pb-10">
        <router-view />
      </main>
    </div>
  </div>
</template>

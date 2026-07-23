<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Mail, Lock, Loader2 } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { ROLE_LABELS } from '../lib/format';

const auth = useAuthStore();
const router = useRouter();

const email = ref('arif@orenmacstore.id');
const password = ref('');
const loading = ref(false);
const error = ref('');

const DEMO_ACCOUNTS = [
  { role: 'owner', email: 'arif@orenmacstore.id' },
  { role: 'admin', email: 'siti@orenmacstore.id' },
  { role: 'kasir', email: 'dedi@orenmacstore.id' },
  { role: 'teknisi', email: 'yusuf@orenmacstore.id' },
];

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push('/dashboard');
  } catch (err) {
    error.value = err.response?.data?.error || 'Gagal masuk. Periksa email dan password Anda.';
  } finally {
    loading.value = false;
  }
}

function quickLogin(account) {
  email.value = account.email;
  password.value = 'password123';
  submit();
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-3xl font-bold">
          <span class="text-brand-500">Oren</span>
          <span class="text-neutral-900 dark:text-white"> MacStore</span>
        </div>
        <p class="text-sm text-neutral-500 mt-2">Masuk untuk mengelola toko Anda</p>
      </div>

      <form @submit.prevent="submit" class="card p-6 space-y-4">
        <div>
          <label class="label">Email</label>
          <div class="relative">
            <Mail :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input v-model="email" type="email" required class="input !pl-9" placeholder="nama@orenmacstore.id" />
          </div>
        </div>
        <div>
          <label class="label">Password</label>
          <div class="relative">
            <Lock :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input v-model="password" type="password" required class="input !pl-9" placeholder="••••••••" />
          </div>
        </div>

        <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="loading">
          <Loader2 v-if="loading" :size="16" class="animate-spin" />
          Masuk
        </button>
      </form>

      <div class="mt-6">
        <p class="text-center text-xs text-neutral-400 mb-2">Login cepat (akun demo)</p>
        <div class="grid grid-cols-4 gap-2">
          <button
            v-for="acc in DEMO_ACCOUNTS"
            :key="acc.role"
            type="button"
            class="btn-secondary text-xs !px-2"
            :disabled="loading"
            @click="quickLogin(acc)"
          >
            {{ ROLE_LABELS[acc.role] }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

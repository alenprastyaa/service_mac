import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const roles4 = ['owner', 'admin', 'kasir', 'teknisi'];

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/cek-service/:ticketNo?', name: 'cek-service', component: () => import('../views/CekStatusPublic.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../layouts/DashboardLayout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('../views/Dashboard.vue') },
      { path: 'stok-barang', name: 'stok-barang', component: () => import('../views/StokBarang.vue'), meta: { roles: ['owner', 'admin', 'kasir'] } },
      { path: 'barang-masuk', name: 'barang-masuk', component: () => import('../views/BarangMasuk.vue'), meta: { roles: ['owner', 'admin', 'kasir'] } },
      { path: 'penjualan', name: 'penjualan', component: () => import('../views/Penjualan.vue'), meta: { roles: ['owner', 'admin', 'kasir'] } },
      { path: 'service-macbook', name: 'service-macbook', component: () => import('../views/ServiceMacBook.vue'), meta: { roles: roles4 } },
      { path: 'service-macbook/:id/nota', name: 'service-nota', component: () => import('../views/NotaService.vue'), meta: { roles: roles4 } },
      { path: 'pelanggan', name: 'pelanggan', component: () => import('../views/Pelanggan.vue') },
      { path: 'supplier', name: 'supplier', component: () => import('../views/Supplier.vue'), meta: { roles: ['owner', 'admin'] } },
      { path: 'laporan', name: 'laporan', component: () => import('../views/Laporan.vue'), meta: { roles: ['owner', 'admin'] } },
      { path: 'pengaturan', name: 'pengaturan', component: () => import('../views/Pengaturan.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) return next('/login');
  if (to.path === '/login' && auth.isAuthenticated) return next('/dashboard');
  if (to.meta.roles && !to.meta.roles.includes(auth.role)) return next('/dashboard');
  next();
});

export default router;

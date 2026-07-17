# Oren MacStore

Aplikasi manajemen toko & service MacBook — Node.js (Express) + Vue 3, dijalankan sebagai **satu service** (backend menyajikan API sekaligus build frontend).

## Stack

- **Backend**: Express + MySQL (`mysql2`), JWT auth, bcrypt.
- **Frontend**: Vue 3 + Vite + Pinia + Vue Router + Tailwind CSS + Chart.js.
- **Database**: MySQL/MariaDB.

## Struktur

```
server/   # Express API + serve hasil build frontend (src/index.js)
client/   # Vue 3 app (build output → server/public)
```

## Status di mesin ini

Sudah dikonfigurasi & terisi data contoh:
- Database `oren_macstore` dibuat di MySQL yang sudah berjalan lewat **XAMPP** (port 3306).
- User database khusus aplikasi: `oren_app` (bukan root) — kredensial ada di `server/.env`.
- Data contoh (produk, pelanggan, supplier, penjualan, tiket service) sudah di-seed.
- Frontend sudah di-build ke `server/public`.

Jalankan aplikasi:

```bash
cd server
npm start
```

Buka **http://localhost:4000**.

### Akun login (password sama untuk semua: `password123`)

| Role     | Email                     | Akses                                              |
|----------|----------------------------|-----------------------------------------------------|
| Owner    | arif@orenmacstore.id       | Semua menu + manajemen pengguna                     |
| Admin    | siti@orenmacstore.id       | Semua menu kecuali manajemen pengguna                |
| Kasir    | dedi@orenmacstore.id       | Stok, Barang Masuk, Penjualan, Service, Pelanggan   |
| Teknisi  | yusuf@orenmacstore.id      | Service MacBook, Pelanggan (lihat saja)             |

## Setup dari nol (mesin lain)

1. Siapkan MySQL/MariaDB yang jalan, lalu buat database + user:
   ```sql
   CREATE DATABASE oren_macstore CHARACTER SET utf8mb4;
   CREATE USER 'oren_app'@'localhost' IDENTIFIED BY 'password-anda';
   GRANT ALL PRIVILEGES ON oren_macstore.* TO 'oren_app'@'localhost';
   ```
2. Salin `server/.env.example` menjadi `server/.env` dan isi kredensial DB, `JWT_SECRET`, serta `DEVICE_PASSWORD_KEY` (dipakai mengenkripsi password perangkat pada tiket service).
3. Install dependency & seed data contoh:
   ```bash
   npm run install:all   # dari root: install server + client
   npm run seed           # dari root: buat skema + isi data contoh
   ```
4. Build frontend lalu jalankan sebagai satu service:
   ```bash
   npm run build           # build Vue -> server/public
   npm start                # jalankan Express (API + frontend) di :4000
   ```

## Mode pengembangan (hot reload)

```bash
npm run dev
```
Menjalankan backend (nodemon, :4000) dan frontend (Vite dev server, :5173) secara paralel — buka `http://localhost:5173` (proxy otomatis ke API).

## Fitur per menu

- **Dashboard** — ringkasan penjualan hari ini, profit bulan ini, stok, service aktif, grafik penjualan, status service, transaksi terbaru, stok menipis.
- **Stok Barang** — CRUD produk, kategori, indikator stok menipis.
- **Barang Masuk** — catat penerimaan stok dari supplier, otomatis menambah stok.
- **Penjualan** — kasir/POS: keranjang, pilih pelanggan, diskon, metode bayar, otomatis mengurangi stok & mencatat invoice.
- **Service MacBook** — tiket perbaikan lengkap: data pelanggan (baru atau terdaftar), detail perangkat (model, warna, storage, password terenkripsi), checklist kondisi fisik & kelengkapan dinamis, diagnosis → penugasan teknisi → sparepart → selesai, dengan riwayat status. Tiap tiket punya **Nota Penerimaan** siap cetak (`/service-macbook/:id/nota`) yang meniru nota fisik toko, lengkap dengan QR code cek status.
- **Cek Status Service** (`/cek-service`) — halaman publik tanpa login, dituju oleh QR code di nota, hanya menampilkan status & riwayat (tanpa data sensitif).
- **Pelanggan / Supplier** — data kontak + riwayat transaksi/pengiriman.
- **Laporan** — penjualan, profit, stok, service dengan filter tanggal dan export CSV.
- **Pengaturan** — profil & ganti password (semua role); khusus Owner/Admin: profil toko (info yang tampil di nota), **checklist kondisi fisik & kelengkapan yang bisa diatur sendiri** (tambah/ubah/nonaktifkan/hapus/urutkan — tidak hardcode di kode, langsung dipakai form tiket & nota), dan manajemen pengguna (khusus Owner).

## Keamanan

- Password di-hash dengan bcrypt, autentikasi via JWT (12 jam).
- Password/login perangkat pelanggan pada tiket service dienkripsi (AES-256-GCM) sebelum disimpan, hanya didekripsi untuk staff yang login; endpoint publik cek status tidak pernah mengembalikannya.
- Akses endpoint dibatasi per role (`owner`, `admin`, `kasir`, `teknisi`) di level middleware.
- `server/.env` tidak boleh di-commit (sudah masuk `.gitignore`).
# service_mac

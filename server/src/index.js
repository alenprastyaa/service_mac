require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/stock-movements', require('./routes/stockMovements.routes'));
app.use('/api/customers', require('./routes/customers.routes'));
app.use('/api/suppliers', require('./routes/suppliers.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/sales', require('./routes/sales.routes'));
app.use('/api/services', require('./routes/services.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/checklist-templates', require('./routes/checklistTemplates.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/public', require('./routes/public.routes'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve the built Vue SPA (single-service deployment).
const clientDist = path.join(__dirname, '..', 'public');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend belum di-build. Jalankan `npm run build` di folder client.');
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Terjadi kesalahan pada server' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Oren MacStore server berjalan di http://localhost:${PORT}`));

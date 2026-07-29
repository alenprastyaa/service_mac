import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS, STATUS_LABELS } from './format';

// Normalizes an Indonesian phone number (leading 0 or +62) into the 62xxxx
// format wa.me expects.
export function normalizeWaPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

export function buildSaleWaMessage(sale, store) {
  const time = `${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(sale.created_at))} WIB`;
  const paymentLabel = PAYMENT_METHOD_LABELS[sale.payment_method] || sale.payment_method;
  const statusLabel = STATUS_LABELS[sale.status] || sale.status;

  const lines = [`*${store.store_name || 'Oren MacStore'}*`];
  if (store.tagline) lines.push(`_${store.tagline}_`);
  lines.push('', `*${sale.invoice_no}*`, `${formatDate(sale.created_at)} • ${time}`, '');

  sale.items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.product_name}`);
    lines.push(`    ${it.qty} x ${formatCurrency(it.price)} = ${formatCurrency(it.subtotal)}`);
  });

  lines.push('', `Subtotal: ${formatCurrency(sale.subtotal)}`);
  if (Number(sale.discount) > 0) lines.push(`Diskon: -${formatCurrency(sale.discount)}`);
  if (Number(sale.tax) > 0) lines.push(`Pajak: ${formatCurrency(sale.tax)}`);
  lines.push(`*TOTAL: ${formatCurrency(sale.total)}*`, '');
  lines.push(`Pembayaran: ${paymentLabel} (${statusLabel})`, '');
  if (store.bank_account_number) {
    lines.push(`Transfer ke: ${store.bank_name || ''} ${store.bank_account_number} a.n. ${store.bank_account_holder || ''}`, '');
  }
  lines.push('Terima kasih atas kepercayaan Anda 🙏');
  return lines.join('\n');
}

export function openSaleWhatsApp(sale, store) {
  const phone = normalizeWaPhone(sale.customer_phone);
  const text = encodeURIComponent(buildSaleWaMessage(sale, store));
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

export function buildServiceWaMessage(service, store, checkUrl) {
  const lines = [`*${store.store_name || 'Oren MacStore'}*`];
  if (store.tagline) lines.push(`_${store.tagline}_`);
  lines.push('', `*${service.ticket_no}*`, formatDate(service.received_at), '');

  lines.push(`Perangkat: ${service.device_model}`);
  if (service.model_number) lines.push(`Model: ${service.model_number}`);
  lines.push(`Keluhan: ${service.complaint}`);
  lines.push(`Estimasi Pengecekan: ${service.checkup_estimate}`, '');
  lines.push(`Status saat ini: *${STATUS_LABELS[service.status] || service.status}*`, '');
  if (store.bank_account_number) {
    lines.push(`Transfer ke: ${store.bank_name || ''} ${store.bank_account_number} a.n. ${store.bank_account_holder || ''}`, '');
  }
  if (checkUrl) lines.push(`Cek status kapan saja di: ${checkUrl}`, '');
  lines.push('Terima kasih atas kepercayaan Anda 🙏');
  return lines.join('\n');
}

export function openServiceWhatsApp(service, store, checkUrl) {
  const phone = normalizeWaPhone(service.customer_phone);
  const text = encodeURIComponent(buildServiceWaMessage(service, store, checkUrl));
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

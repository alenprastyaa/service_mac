const UPLOAD_ENDPOINT = 'https://upload-file.applicationservice.id/api/upload-file';

// Uploads a file buffer to the external file host and returns its public URL.
async function uploadImage(buffer, filename, mimetype) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimetype }), filename);

  const res = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: form });
  if (!res.ok) throw Object.assign(new Error('Gagal mengunggah foto ke server penyimpanan'), { status: 502 });

  const json = await res.json();
  if (json.status !== 200 || !json.data?.url) throw Object.assign(new Error(json.message || 'Gagal mengunggah foto ke server penyimpanan'), { status: 502 });

  return json.data.url;
}

module.exports = { uploadImage };

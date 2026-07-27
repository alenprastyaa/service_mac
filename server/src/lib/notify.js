// Inserts a notification row using the caller's transaction connection, so a sale/service
// notification only lands if the surrounding transaction actually commits.
async function notify(conn, { type, title, message, ref_type = null, ref_id = null }) {
  await conn.query(
    'INSERT INTO notifications (type, title, message, ref_type, ref_id) VALUES (?, ?, ?, ?, ?)',
    [type, title, message, ref_type, ref_id]
  );
}

module.exports = { notify };

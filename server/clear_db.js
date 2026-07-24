const { Database } = require('node-sqlite3-wasm');
const path = require('path');

const DB_PATH = path.join(__dirname, 'pmo_data.db');
const db = new Database(DB_PATH);

console.log('Clearing database for fresh installation...');

try {
  try { db.prepare('DELETE FROM projects').run(); console.log('Projects cleared.'); } catch(e){}
  try { db.prepare('DELETE FROM health_cards').run(); console.log('Health Cards cleared.'); } catch(e){}
  try { db.prepare('DELETE FROM audit_log').run(); console.log('Audit Logs cleared.'); } catch(e){}
  try { db.prepare('DELETE FROM notifications').run(); console.log('Notifications cleared.'); } catch(e){}
  try { db.prepare("DELETE FROM users WHERE role != 'admin' AND email != 'admin@marutisuzuki.com'").run(); console.log('Non-admin users cleared.'); } catch(e){}

  console.log('Database successfully cleared for production use!');
} catch (e) {
  console.error('Failed to clear database:', e);
}

db.close();

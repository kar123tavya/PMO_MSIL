const { Database } = require('node-sqlite3-wasm');
const db = new Database('C:/Users/Dell/Desktop/SafaaiLoop/server/pmo_data.db');
const rows = db.all('SELECT id, to_users, cc_users, from_user FROM notifications');
let count = 0;
rows.forEach(row => {
  let toUsers = JSON.parse(row.to_users || '[]');
  let ccUsers = JSON.parse(row.cc_users || '[]');
  let fromUser = row.from_user;
  
  const fix = (val) => {
    if (val && val.length === 36 && val.includes('-')) {
      const u = db.get('SELECT email FROM users WHERE id=?', [val]);
      return u ? u.email : val;
    }
    return val;
  };
  
  const newTo = toUsers.map(fix);
  const newCc = ccUsers.map(fix);
  const newFrom = fix(fromUser);
  
  if (JSON.stringify(newTo) !== JSON.stringify(toUsers) || JSON.stringify(newCc) !== JSON.stringify(ccUsers) || newFrom !== fromUser) {
    db.run('UPDATE notifications SET to_users=?, cc_users=?, from_user=? WHERE id=?', [JSON.stringify(newTo), JSON.stringify(newCc), newFrom, row.id]);
    count++;
  }
});
console.log(`Database fix complete. Fixed ${count} notifications.`);

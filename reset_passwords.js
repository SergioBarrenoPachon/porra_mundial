const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');
const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

const credentials = [
  { username: "Sofia",    password: "girasol" },
  { username: "Pablo",    password: "trueno7" },
  { username: "Olga",     password: "cometa3" },
  { username: "Ada",      password: "brisa22" },
  { username: "Clau",     password: "volcan9" },
  { username: "Sergio B", password: "rayo2026" },
  { username: "Alex",     password: "nube14" },
  { username: "Sergio L", password: "fuego55" }
];

credentials.forEach(cred => {
  const user = db.users.find(u => u.username === cred.username);
  if (!user) {
    console.error(`User not found: ${cred.username}`);
    return;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(cred.password + salt).digest('hex');
  user.salt = salt;
  user.passwordHash = hash;
  console.log(`✅ ${cred.username} -> ${cred.password}`);
});

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log('\ndata.json updated successfully!');

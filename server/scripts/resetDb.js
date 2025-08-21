const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'inventory.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Deleted inventory.db');
} else {
  console.log('No inventory.db found; nothing to delete.');
}

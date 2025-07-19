const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to SQLite database file (will create the file if it doesn't exist)
const db = new sqlite3.Database(path.join(__dirname, 'inventory.db'), (err) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create the inventory table if it doesn't exist
const createTableQuery = `CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER,
  unit TEXT,
  restock_threshold INTEGER,
  supplier TEXT
)`;

// Ensure the table exists and populate it with sample data on first run
// `serialize` ensures that the queries run sequentially

db.serialize(() => {
  db.run(createTableQuery);

  db.get('SELECT COUNT(*) AS count FROM inventory', (err, row) => {
    if (err) {
      console.error('Error counting inventory rows:', err.message);
      return;
    }
    if (row.count === 0) {
      const insertStmt = db.prepare(
        'INSERT INTO inventory (name, category, quantity, unit, restock_threshold, supplier) VALUES (?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run('Pens', 'Office Supplies', 100, 'pack', 20, 'Staples');
      insertStmt.run('Printer Paper', 'Office Supplies', 500, 'ream', 100, 'Office Depot');
      insertStmt.run('Ink Toner', 'Printing', 10, 'cartridge', 2, 'HP');
      insertStmt.finalize();
    }
  });
});

module.exports = db;

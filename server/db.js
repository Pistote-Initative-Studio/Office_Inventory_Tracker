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
const createInventoryQuery = `CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER,
  unit TEXT,
  restock_threshold INTEGER,
  supplier TEXT,
  last_price REAL,
  -- new optional columns for location and product number
  location TEXT,
  product_number TEXT
)`;

// Create purchaseOrders table if it doesn't exist
const createOrdersQuery = `CREATE TABLE IF NOT EXISTS purchaseOrders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  itemName TEXT,
  quantity INTEGER,
  supplier TEXT,
  price REAL,
  notes TEXT,
  orderDate TEXT,
  items TEXT,
  status TEXT DEFAULT 'final',
  last_modified TEXT
)`;

// Table to keep track of registered businesses
const createBusinessesQuery = `CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE
)`;

// Create users table if it doesn't exist
const createUsersQuery = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'employee'
)`;

// Ensure the tables exist and perform schema updates sequentially
// `serialize` ensures that the queries run sequentially

db.serialize(() => {
  db.run(createInventoryQuery);
  db.run(createOrdersQuery);
  db.run(createBusinessesQuery);
  db.run(createUsersQuery);
  // Add the items column if it was created before this field existed
  db.run('ALTER TABLE purchaseOrders ADD COLUMN items TEXT', (err) => {
    // ignore errors if column already exists
  });
  // Add the price column if it was created before this field existed
  db.run('ALTER TABLE purchaseOrders ADD COLUMN price REAL', (err) => {
    // ignore errors if column already exists
  });
  // Add status column if it doesn't exist
  db.run("ALTER TABLE purchaseOrders ADD COLUMN status TEXT DEFAULT 'final'", (err) => {
    // ignore errors if column already exists
  });
  // Add last_modified column if it doesn't exist
  db.run('ALTER TABLE purchaseOrders ADD COLUMN last_modified TEXT', (err) => {
    // ignore errors if column already exists
  });
  // Add last_price column for inventory if it doesn't exist
  db.run('ALTER TABLE inventory ADD COLUMN last_price REAL', (err) => {
    // ignore errors if column already exists
  });

  // Add location column for inventory if it doesn't exist
  db.run('ALTER TABLE inventory ADD COLUMN location TEXT', (err) => {
    // ignore errors if column already exists
  });

  // Add product_number column for inventory if it doesn't exist
  db.run('ALTER TABLE inventory ADD COLUMN product_number TEXT', (err) => {
    // ignore errors if column already exists
  });

  // Add role column for users if it doesn't exist
  db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'employee'", (err) => {
    // ignore errors if column already exists
  });

  // Add business_id column for users if it doesn't exist
  db.run('ALTER TABLE users ADD COLUMN business_id INTEGER', (err) => {
    // ignore errors if column already exists
  });

  // Add full_name column for users if it doesn't exist
  db.run('ALTER TABLE users ADD COLUMN full_name TEXT', (err) => {
    // ignore errors if column already exists
  });

  // Create table for user settings if it doesn't exist
  db.run(`CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    theme TEXT DEFAULT 'light',
    default_tab TEXT DEFAULT 'Inventory',
    email_notifications INTEGER DEFAULT 1,
    low_stock_alerts INTEGER DEFAULT 1,
    po_updates INTEGER DEFAULT 1
  )`);
});

module.exports = db;

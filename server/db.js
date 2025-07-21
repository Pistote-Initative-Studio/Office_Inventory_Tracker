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
  last_price REAL
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
  items TEXT
)`;

// Ensure the table exists and populate it with sample data on first run
// `serialize` ensures that the queries run sequentially

db.serialize(() => {
  db.run(createInventoryQuery);
  db.run(createOrdersQuery);
  // Add the items column if it was created before this field existed
  db.run('ALTER TABLE purchaseOrders ADD COLUMN items TEXT', (err) => {
    // ignore errors if column already exists
  });
  // Add the price column if it was created before this field existed
  db.run('ALTER TABLE purchaseOrders ADD COLUMN price REAL', (err) => {
    // ignore errors if column already exists
  });
  // Add last_price column for inventory if it doesn't exist
  db.run('ALTER TABLE inventory ADD COLUMN last_price REAL', (err) => {
    // ignore errors if column already exists
  });

  db.get('SELECT COUNT(*) AS count FROM inventory', (err, row) => {
    if (err) {
      console.error('Error counting inventory rows:', err.message);
      return;
    }
    if (row.count === 0) {
      const insertStmt = db.prepare(
        'INSERT INTO inventory (name, category, quantity, unit, restock_threshold, supplier, last_price) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      insertStmt.run('Pens', 'Office Supplies', 120, 'box', 50, 'Staples', 52);
      insertStmt.run('Printer Paper', 'Office Supplies', 600, 'ream', 200, 'Office Depot', 540);
      insertStmt.run('Stapler', 'Office Supplies', 20, 'unit', 10, 'Staples', 30);
      insertStmt.run('Ink Toner', 'Printing', 15, 'cartridge', 5, 'HP', 200);
      insertStmt.run('Color Printer', 'Technology', 2, 'unit', 1, 'Canon', 350);
      insertStmt.run('Laptop', 'Technology', 10, 'unit', 5, 'Dell', 1950);
      insertStmt.run('Monitor', 'Technology', 8, 'unit', 3, 'Dell', 150);
      insertStmt.run('Mouse', 'Technology', 40, 'unit', 10, 'Logitech', 250);
      insertStmt.run('Cleaning Wipes', 'Office Supplies', 25, 'pack', 5, 'Staples', 40);
      insertStmt.run('USB Flash Drive', 'Technology', 60, 'unit', 20, 'SanDisk', 120);
      insertStmt.finalize();
    }
  });

  db.get('SELECT COUNT(*) AS count FROM purchaseOrders', (err, row) => {
    if (err) {
      console.error('Error counting purchase order rows:', err.message);
      return;
    }
    if (row.count === 0) {
      const orderStmt = db.prepare(
        'INSERT INTO purchaseOrders (itemName, quantity, supplier, price, notes, orderDate, items) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      const orders = [
        { itemName: 'Pens', quantity: 100, supplier: 'Staples', price: 50, date: '2023-08-15' },
        { itemName: 'Pens', quantity: 150, supplier: 'Staples', price: 75, date: '2023-09-15' },
        { itemName: 'Pens', quantity: 100, supplier: 'Staples', price: 48, date: '2023-10-20' },
        { itemName: 'Printer Paper', quantity: 200, supplier: 'Office Depot', price: 800, date: '2023-10-30' },
        { itemName: 'Pens', quantity: 200, supplier: 'Staples', price: 104, date: '2023-12-05' },
        { itemName: 'Laptop', quantity: 2, supplier: 'Dell', price: 2400, date: '2023-09-12' },
        { itemName: 'Laptop', quantity: 5, supplier: 'Dell', price: 3000, date: '2024-01-05' },
        { itemName: 'Pens', quantity: 150, supplier: 'Staples', price: 78, date: '2024-02-10' },
        {
          itemName: null,
          quantity: null,
          supplier: null,
          price: 277,
          date: '2024-03-15',
          items: [
            { itemName: 'Pens', quantity: 100, supplier: 'Staples', price: 52 },
            {
              itemName: 'Printer Paper',
              quantity: 50,
              supplier: 'Office Depot',
              price: 225,
            },
          ],
        },
        { itemName: 'Printer Paper', quantity: 120, supplier: 'Office Depot', price: 540, date: '2024-04-20' },
        {
          itemName: null,
          quantity: null,
          supplier: null,
          price: 2200,
          date: '2024-05-01',
          items: [
            { itemName: 'Laptop', quantity: 3, supplier: 'Dell', price: 1950 },
            { itemName: 'Mouse', quantity: 50, supplier: 'Logitech', price: 250 },
          ],
        },
        { itemName: 'Stapler', quantity: 20, supplier: 'Staples', price: 30, date: '2024-02-05' },
        { itemName: 'Color Printer', quantity: 1, supplier: 'Canon', price: 350, date: '2024-01-25' },
        { itemName: 'Ink Toner', quantity: 5, supplier: 'HP', price: 200, date: '2024-03-05' },
        { itemName: 'Cleaning Wipes', quantity: 10, supplier: 'Staples', price: 40, date: '2024-04-10' },
        { itemName: 'USB Flash Drive', quantity: 30, supplier: 'SanDisk', price: 120, date: '2024-02-20' },
        { itemName: 'Monitor', quantity: 5, supplier: 'Dell', price: 150, date: '2024-03-22' },
      ];

      orders.forEach((o) => {
        orderStmt.run(
          o.itemName,
          o.quantity,
          o.supplier,
          o.price,
          '',
          o.date,
          JSON.stringify(o.items || [{ itemName: o.itemName, quantity: o.quantity, supplier: o.supplier, price: o.price }])
        );
      });
      orderStmt.finalize();
    }
  });
});

module.exports = db;

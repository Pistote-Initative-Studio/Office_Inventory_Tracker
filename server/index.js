const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('./db');
// Import inventory routes
const inventoryRoutes = require('./routes/inventory');

// Helper functions for sqlite3 Promises
const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// Directory for generated PDFs
const ordersDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(ordersDir)) {
  fs.mkdirSync(ordersDir);
}

const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON bodies

// Mount the inventory API routes
app.use('/inventory', inventoryRoutes);

// POST /api/purchase-orders -> create a purchase order and generate PDF
app.post('/api/purchase-orders', async (req, res) => {
  const { items, itemName, quantity, supplier, notes, orderDate } = req.body;
  try {
    const orderItems = Array.isArray(items)
      ? items
      : [{ itemName, quantity, supplier }];
    const date = orderDate || new Date().toISOString();
    const result = await runAsync(
      'INSERT INTO purchaseOrders (itemName, quantity, supplier, notes, orderDate, items) VALUES (?, ?, ?, ?, ?, ?)',
      [itemName || null, quantity || null, supplier || null, notes, date, JSON.stringify(orderItems)]
    );
    const id = result.lastID;

    const filePath = path.join(ordersDir, `purchase_order_${id}.pdf`);
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      doc.fontSize(20).text('Purchase Order', { align: 'center' });
      doc.moveDown();
      doc.text(`Order ID: ${id}`);
      doc.text(`Date: ${date}`);
      doc.moveDown();
      orderItems.forEach((it, idx) => {
        doc.text(`${idx + 1}. Item: ${it.itemName}`);
        doc.text(`   Qty: ${it.quantity}`);
        doc.text(`   Supplier: ${it.supplier}`);
        doc.moveDown();
      });
      doc.text('Notes:');
      doc.text(notes || '');
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('Failed to create purchase order:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/purchase-orders -> return all purchase orders
app.get('/api/purchase-orders', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM purchaseOrders ORDER BY id DESC');
    const parsed = rows.map((r) => ({
      ...r,
      items: r.items ? JSON.parse(r.items) : null,
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('Failed to retrieve purchase orders:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/purchase-orders/:id/pdf -> download PDF
app.get('/api/purchase-orders/:id/pdf', (req, res) => {
  const filePath = path.join(ordersDir, `purchase_order_${req.params.id}.pdf`);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('PDF not found');
  }
});

const PORT = 5000;

app.get('/', (req, res) => {
  res.send('Office Inventory Backend Running');
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

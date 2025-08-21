const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const db = require('./db');
// Import inventory routes
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');

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

function authenticateToken(req, res, next) {
  next();
}

function requireAdmin(req, res, next) {
  next();
}

// Directory for generated PDFs
const ordersDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(ordersDir)) {
  fs.mkdirSync(ordersDir);
}

const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON bodies

// Mount the inventory and reports routes publicly
app.use('/inventory', inventoryRoutes);
app.use('/api/reports', reportsRoutes);

// POST /api/purchase-orders -> create a purchase order and generate PDF
app.post('/api/purchase-orders', async (req, res) => {
  const { items, itemName, quantity, supplier, price, notes, orderDate, status } = req.body;
  try {
    const orderItems = Array.isArray(items)
      ? items
      : [{ itemName, quantity, supplier, price }];
    const totalPrice = orderItems.reduce((sum, it) => sum + Number(it.price || 0), 0);
    const date = orderDate || new Date().toISOString();
    const mod = new Date().toISOString();
    const stat = status || 'final';
    const result = await runAsync(
      'INSERT INTO purchaseOrders (itemName, quantity, supplier, price, notes, orderDate, items, status, last_modified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [itemName || null, quantity || null, supplier || null, totalPrice, notes, date, JSON.stringify(orderItems), stat, mod]
    );
    const id = result.lastID;
    if (stat === 'final') {
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
          // Include additional fields if present
          if (it.unit !== undefined) doc.text(`   Unit: ${it.unit}`);
          doc.text(`   Supplier: ${it.supplier}`);
          if (it.product_number !== undefined)
            doc.text(`   Product Number: ${it.product_number}`);
          if (it.price !== undefined) doc.text(`   Price: $${it.price}`);
          doc.moveDown();
        });
        doc.text(`Total Price: $${totalPrice}`);
        doc.text('Notes:');
        doc.text(notes || '');
        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    }

    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error('Failed to create purchase order:', err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/purchase-orders -> return all purchase orders
app.get('/api/purchase-orders', async (req, res) => {
  try {
    let sql = 'SELECT * FROM purchaseOrders';
    const params = [];
    if (req.query.status) {
      sql += ' WHERE status=?';
      params.push(req.query.status);
    }
    sql += ' ORDER BY id DESC';
    const rows = await allAsync(sql, params);
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
// GET /api/purchase-orders/:id/pdf -> download or generate PDF on the fly
app.get('/api/purchase-orders/:id/pdf', async (req, res) => {
  const id = req.params.id;
  const filePath = path.join(ordersDir, `purchase_order_${id}.pdf`);
  // If a pre-generated PDF exists, download it
  if (fs.existsSync(filePath)) {
    return res.download(filePath);
  }
  try {
    // Otherwise, fetch the order and generate a PDF on the fly
    const row = await getAsync('SELECT * FROM purchaseOrders WHERE id=?', [id]);
    if (!row) return res.status(404).send('Order not found');
    // Parse items array or fallback to single item fields
    const orderItems = row.items
      ? JSON.parse(row.items)
      : [{ itemName: row.itemName, quantity: row.quantity, supplier: row.supplier, price: row.price }];
    const totalPrice = Number(row.price) || orderItems.reduce((sum, it) => sum + Number(it.price || 0), 0);
    const chunks = [];
    const doc = new PDFDocument();
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => {
      res.setHeader('Content-Disposition', `attachment; filename="purchase_order_${id}.pdf"`);
      res.type('application/pdf');
      res.send(Buffer.concat(chunks));
    });
    // Build the PDF similar to the on-create logic
    doc.fontSize(20).text('Purchase Order', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${id}`);
    doc.text(`Date: ${row.orderDate || ''}`);
    doc.moveDown();
    orderItems.forEach((it, idx) => {
      doc.text(`${idx + 1}. Item: ${it.itemName}`);
      doc.text(`   Qty: ${it.quantity}`);
      // Include additional fields if present
      if (it.unit !== undefined) doc.text(`   Unit: ${it.unit}`);
      doc.text(`   Supplier: ${it.supplier}`);
      if (it.product_number !== undefined)
        doc.text(`   Product Number: ${it.product_number}`);
      if (it.price !== undefined) doc.text(`   Price: $${it.price}`);
      doc.moveDown();
    });
    doc.text(`Total Price: $${totalPrice}`);
    doc.text('Notes:');
    doc.text(row.notes || '');
    doc.end();
  } catch (err) {
    console.error('download pdf', err.message);
    res.status(500).send('Server error');
  }
});

// PUT /api/purchase-orders/:id -> update a purchase order (draft or finalize)
app.put('/api/purchase-orders/:id', async (req, res) => {
  const { items, notes, status } = req.body;
  const id = req.params.id;
  try {
    const mod = new Date().toISOString();
    const row = await getAsync('SELECT * FROM purchaseOrders WHERE id=?', [id]);
    if (!row) return res.status(404).json({ success: false });
    const orderItems = Array.isArray(items) ? items : row.items ? JSON.parse(row.items) : [];
    const totalPrice = orderItems.reduce((sum, it) => sum + Number(it.price || 0), 0);
    await runAsync(
      'UPDATE purchaseOrders SET items=?, price=?, notes=?, status=?, last_modified=? WHERE id=?',
      [JSON.stringify(orderItems), totalPrice, notes || '', status || row.status, mod, id]
    );
    if ((status || row.status) === 'final') {
      const filePath = path.join(ordersDir, `purchase_order_${id}.pdf`);
      await new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        doc.fontSize(20).text('Purchase Order', { align: 'center' });
        doc.moveDown();
        doc.text(`Order ID: ${id}`);
        doc.text(`Date: ${row.orderDate}`);
        doc.moveDown();
        orderItems.forEach((it, idx) => {
          doc.text(`${idx + 1}. Item: ${it.itemName}`);
          doc.text(`   Qty: ${it.quantity}`);
          // Include additional fields if present
          if (it.unit !== undefined) doc.text(`   Unit: ${it.unit}`);
          doc.text(`   Supplier: ${it.supplier}`);
          if (it.product_number !== undefined)
            doc.text(`   Product Number: ${it.product_number}`);
          if (it.price !== undefined) doc.text(`   Price: $${it.price}`);
          doc.moveDown();
        });
        doc.text(`Total Price: $${totalPrice}`);
        doc.text('Notes:');
        doc.text(notes || '');
        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('update order', err.message);
    res.status(500).json({ success: false });
  }
});

// DELETE /api/purchase-orders/:id -> remove an order
app.delete('/api/purchase-orders/:id', async (req, res) => {
  try {
    const result = await runAsync('DELETE FROM purchaseOrders WHERE id=?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ success: false });
    const filePath = path.join(ordersDir, `purchase_order_${req.params.id}.pdf`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    console.error('delete order', err.message);
    res.status(500).json({ success: false });
  }
});

// GET /api/purchase-orders/frequent -> top 10 most frequently purchased items
app.get('/api/purchase-orders/frequent', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM purchaseOrders');
    const map = {};
    rows.forEach((r) => {
      const date = r.orderDate;
      const items = r.items ? JSON.parse(r.items) : [{ itemName: r.itemName, quantity: r.quantity, price: r.price }];
      items.forEach((it) => {
        if (!it.itemName) return;
        if (!map[it.itemName]) {
          map[it.itemName] = { count: 0, lastDate: date, lastQty: it.quantity, lastPrice: it.price };
        }
        const rec = map[it.itemName];
        rec.count += 1;
        if (new Date(date) > new Date(rec.lastDate)) {
          rec.lastDate = date;
          rec.lastQty = it.quantity;
          rec.lastPrice = it.price;
        }
      });
    });
    const list = Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, info]) => ({
        itemName: name,
        lastQuantity: info.lastQty,
        lastDate: info.lastDate,
        pricePerItem: Number(info.lastPrice) / Number(info.lastQty || 1),
      }));
    res.json({ success: true, data: list });
  } catch (err) {
    console.error('frequent items', err.message);
    res.status(500).json({ success: false });
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

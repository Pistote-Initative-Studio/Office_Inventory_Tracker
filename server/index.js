const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
// Import inventory routes
const inventoryRoutes = require('./routes/inventory');
const reportsRoutes = require('./routes/reports');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

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
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
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

app.post('/api/register', async (req, res) => {
  const { username, password, accountType, businessName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  try {
    const existing = await getAsync('SELECT id FROM users WHERE username=?', [username]);
    if (existing) return res.status(400).json({ error: 'User exists' });
    const hash = bcrypt.hashSync(password, 10);
    let role = 'admin';
    let bizId = null;
    if (accountType === 'business') {
      if (!businessName) return res.status(400).json({ error: 'Business name required' });
      const biz = await getAsync('SELECT id FROM businesses WHERE name=?', [businessName]);
      if (!biz) {
        const r = await runAsync('INSERT INTO businesses (name) VALUES (?)', [businessName]);
        bizId = r.lastID;
        role = 'admin';
      } else {
        bizId = biz.id;
        role = 'employee';
      }
    }
    const result = await runAsync(
      'INSERT INTO users (username, password, role, business_id, full_name) VALUES (?, ?, ?, ?, ?)',
      [username, hash, role, bizId, username]
    );
    await runAsync('INSERT INTO user_settings (user_id) VALUES (?)', [result.lastID]);
    const token = jwt.sign({ id: result.lastID, role, businessId: bizId }, JWT_SECRET);
    res.json({ token, role, businessId: bizId });
  } catch (err) {
    console.error('register', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await getAsync('SELECT * FROM users WHERE username=?', [username]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role, businessId: user.business_id }, JWT_SECRET);
    res.json({ token, role: user.role, businessId: user.business_id });
  } catch (err) {
    console.error('login', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin-only user management
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await allAsync('SELECT id, username, role FROM users WHERE business_id=?', [req.user.businessId]);
    res.json({ data: rows });
  } catch (err) {
    console.error('users list', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { role } = req.body;
  try {
    const target = await getAsync('SELECT id FROM users WHERE id=? AND business_id=?', [req.params.id, req.user.businessId]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    await runAsync('UPDATE users SET role=? WHERE id=?', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('update role', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const target = await getAsync('SELECT id FROM users WHERE id=? AND business_id=?', [req.params.id, req.user.businessId]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    await runAsync('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('delete user', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Current user account info
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const row = await getAsync(
      'SELECT u.username, u.role, u.full_name, b.name AS businessName FROM users u LEFT JOIN businesses b ON u.business_id=b.id WHERE u.id=?',
      [req.user.id]
    );
    res.json({ data: row });
  } catch (err) {
    console.error('me', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/me', authenticateToken, async (req, res) => {
  const { fullName, password } = req.body;
  try {
    if (fullName !== undefined) {
      await runAsync('UPDATE users SET full_name=? WHERE id=?', [fullName, req.user.id]);
    }
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await runAsync('UPDATE users SET password=? WHERE id=?', [hash, req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('update me', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const row = await getAsync('SELECT * FROM user_settings WHERE user_id=?', [req.user.id]);
    res.json({ data: row });
  } catch (err) {
    console.error('get settings', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/settings', authenticateToken, async (req, res) => {
  const { theme, default_tab, email_notifications, low_stock_alerts, po_updates } = req.body;
  try {
    const exists = await getAsync('SELECT user_id FROM user_settings WHERE user_id=?', [req.user.id]);
    if (!exists) {
      await runAsync('INSERT INTO user_settings (user_id) VALUES (?)', [req.user.id]);
    }
    await runAsync(
      `UPDATE user_settings SET
        theme=COALESCE(?, theme),
        default_tab=COALESCE(?, default_tab),
        email_notifications=COALESCE(?, email_notifications),
        low_stock_alerts=COALESCE(?, low_stock_alerts),
        po_updates=COALESCE(?, po_updates)
       WHERE user_id=?`,
      [theme, default_tab, email_notifications, low_stock_alerts, po_updates, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('update settings', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mount the inventory and reports routes with auth
app.use('/inventory', authenticateToken, inventoryRoutes);
app.use('/api/reports', authenticateToken, reportsRoutes);

// POST /api/purchase-orders -> create a purchase order and generate PDF
app.post('/api/purchase-orders', authenticateToken, requireAdmin, async (req, res) => {
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
app.get('/api/purchase-orders', authenticateToken, async (req, res) => {
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
app.get('/api/purchase-orders/:id/pdf', authenticateToken, async (req, res) => {
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
app.put('/api/purchase-orders/:id', authenticateToken, requireAdmin, async (req, res) => {
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
app.delete('/api/purchase-orders/:id', authenticateToken, requireAdmin, async (req, res) => {
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
app.get('/api/purchase-orders/frequent', authenticateToken, async (req, res) => {
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

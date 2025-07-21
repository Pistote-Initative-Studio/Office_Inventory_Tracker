const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// Helper to query purchase orders with optional date range
async function getOrders(start, end) {
  let sql = 'SELECT * FROM purchaseOrders';
  const params = [];
  if (start || end) {
    sql += ' WHERE 1=1';
    if (start) {
      sql += ' AND date(orderDate) >= date(?)';
      params.push(start);
    }
    if (end) {
      sql += ' AND date(orderDate) <= date(?)';
      params.push(end);
    }
  }
  sql += ' ORDER BY orderDate DESC';
  const rows = await allAsync(sql, params);
  return rows.map((r) => ({ ...r, items: r.items ? JSON.parse(r.items) : null }));
}

router.get('/purchase-orders', async (req, res) => {
  try {
    const data = await getOrders(req.query.startDate, req.query.endDate);
    res.json({ success: true, data });
  } catch (err) {
    console.error('reports purchase-orders', err.message);
    res.status(500).json({ success: false });
  }
});

router.get('/purchase-orders/excel', async (req, res) => {
  try {
    const data = await getOrders(req.query.startDate, req.query.endDate);
    const rows = data.map((r) => ({
      Date: r.orderDate,
      Supplier: r.supplier,
      Items: r.items ? r.items.map((i) => i.itemName).join(', ') : r.itemName,
      Quantity: r.items ? r.items.map((i) => i.quantity).join(', ') : r.quantity,
      Total: r.price,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="purchase_orders.xlsx"');
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('excel purchase orders', err.message);
    res.status(500).json({ success: false });
  }
});

router.get('/purchase-orders/pdf', async (req, res) => {
  try {
    const data = await getOrders(req.query.startDate, req.query.endDate);
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => {
      const result = Buffer.concat(chunks);
      res.setHeader('Content-Disposition', 'attachment; filename="purchase_orders.pdf"');
      res.type('application/pdf');
      res.send(result);
    });
    doc.fontSize(16).text('Purchase Orders', { align: 'center' });
    doc.moveDown();
    data.forEach((r) => {
      doc.text(`Date: ${r.orderDate}`);
      doc.text(`Supplier: ${r.supplier}`);
      doc.text(`Items: ${r.items ? r.items.map((i) => i.itemName).join(', ') : r.itemName}`);
      doc.text(`Quantity: ${r.items ? r.items.map((i) => i.quantity).join(', ') : r.quantity}`);
      doc.text(`Total: $${r.price}`);
      doc.moveDown();
    });
    doc.end();
  } catch (err) {
    console.error('pdf purchase orders', err.message);
    res.status(500).json({ success: false });
  }
});

router.get('/item/:id', async (req, res) => {
  try {
    const item = await allAsync('SELECT name FROM inventory WHERE id=?', [req.params.id]);
    if (!item.length) return res.status(404).json({ success: false });
    const name = item[0].name;
    const rows = await allAsync('SELECT * FROM purchaseOrders WHERE (itemName=? OR items LIKE ?) ORDER BY orderDate DESC', [name, `%"itemName":"${name}"%`]);
    const data = rows.map((r) => ({ ...r, items: r.items ? JSON.parse(r.items) : null }));
    res.json({ success: true, data, item: name });
  } catch (err) {
    console.error('reports item', err.message);
    res.status(500).json({ success: false });
  }
});

router.get('/item/:id/excel', async (req, res) => {
  try {
    const item = await allAsync('SELECT name FROM inventory WHERE id=?', [req.params.id]);
    if (!item.length) return res.status(404).send('Not found');
    const name = item[0].name;
    const rows = await allAsync('SELECT * FROM purchaseOrders WHERE (itemName=? OR items LIKE ?) ORDER BY orderDate DESC', [name, `%"itemName":"${name}"%`]);
    const data = rows.map((r) => ({ ...r, items: r.items ? JSON.parse(r.items) : null }));
    const mapped = data.map((r) => {
      let price = r.price;
      let qty = r.quantity;
      let supplier = r.supplier;
      if (r.items) {
        const it = r.items.find((i) => i.itemName === name) || {};
        price = it.price;
        qty = it.quantity;
        supplier = it.supplier;
      }
      return { Date: r.orderDate, Supplier: supplier, Price: price, Quantity: qty };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(mapped);
    XLSX.utils.book_append_sheet(wb, ws, 'Item');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="item_report.xlsx"');
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('excel item', err.message);
    res.status(500).json({ success: false });
  }
});

router.get('/item/:id/pdf', async (req, res) => {
  try {
    const item = await allAsync('SELECT name FROM inventory WHERE id=?', [req.params.id]);
    if (!item.length) return res.status(404).send('Not found');
    const name = item[0].name;
    const rows = await allAsync('SELECT * FROM purchaseOrders WHERE (itemName=? OR items LIKE ?) ORDER BY orderDate DESC', [name, `%"itemName":"${name}"%`]);
    const data = rows.map((r) => ({ ...r, items: r.items ? JSON.parse(r.items) : null }));
    const doc = new PDFDocument();
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => {
      res.setHeader('Content-Disposition', 'attachment; filename="item_report.pdf"');
      res.type('application/pdf');
      res.send(Buffer.concat(chunks));
    });
    doc.fontSize(16).text(`Report for ${name}`, { align: 'center' });
    doc.moveDown();
    data.forEach((r) => {
      let price = r.price;
      let qty = r.quantity;
      let supplier = r.supplier;
      if (r.items) {
        const it = r.items.find((i) => i.itemName === name) || {};
        price = it.price;
        qty = it.quantity;
        supplier = it.supplier;
      }
      doc.text(`Date: ${r.orderDate}`);
      doc.text(`Supplier: ${supplier}`);
      doc.text(`Price: $${price}`);
      doc.text(`Quantity: ${qty}`);
      doc.moveDown();
    });
    doc.end();
  } catch (err) {
    console.error('pdf item', err.message);
    res.status(500).json({ success: false });
  }
});

module.exports = router;


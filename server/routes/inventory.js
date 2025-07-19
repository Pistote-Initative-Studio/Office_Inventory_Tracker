const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper functions to use sqlite3 with Promises
const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

// GET /inventory -> returns all inventory items
router.get('/', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM inventory');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Failed to retrieve items:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /inventory -> insert a new item
router.post('/', async (req, res) => {
  const { name, category, quantity, unit, restock_threshold, supplier } = req.body;

  if (name === undefined || quantity === undefined) {
    return res.status(400).json({ error: "'name' and 'quantity' are required." });
  }

  try {
    const query = `INSERT INTO inventory (name, category, quantity, unit, restock_threshold, supplier)` +
                  ` VALUES (?, ?, ?, ?, ?, ?)`;
    const result = await runAsync(query, [name, category, quantity, unit, restock_threshold, supplier]);
    res.status(201).json({ success: true, data: { id: result.lastID } });
  } catch (err) {
    console.error('Failed to insert item:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /inventory/:id -> update an item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, unit, restock_threshold, supplier } = req.body;

  if (name === undefined || quantity === undefined) {
    return res.status(400).json({ error: "'name' and 'quantity' are required." });
  }

  try {
    const query = `UPDATE inventory SET name=?, category=?, quantity=?, unit=?, restock_threshold=?, supplier=? WHERE id=?`;
    const result = await runAsync(query, [name, category, quantity, unit, restock_threshold, supplier, id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    res.json({ success: true, data: { updated: result.changes } });
  } catch (err) {
    console.error('Failed to update item:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /inventory/:id -> delete an item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await runAsync('DELETE FROM inventory WHERE id=?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found.' });
    }
    res.json({ success: true, data: { deleted: result.changes } });
  } catch (err) {
    console.error('Failed to delete item:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

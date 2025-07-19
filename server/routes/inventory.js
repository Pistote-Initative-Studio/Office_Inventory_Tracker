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
    res.json(rows);
  } catch (err) {
    console.error('Failed to retrieve items:', err.message);
    res.status(500).json({ error: 'Failed to retrieve inventory' });
  }
});

// POST /inventory -> insert a new item
router.post('/', async (req, res) => {
  const { name, category, quantity, unit, restock_threshold, supplier } = req.body;
  try {
    const query = `INSERT INTO inventory (name, category, quantity, unit, restock_threshold, supplier)
                   VALUES (?, ?, ?, ?, ?, ?)`;
    const result = await runAsync(query, [name, category, quantity, unit, restock_threshold, supplier]);
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    console.error('Failed to insert item:', err.message);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// PUT /inventory/:id -> update an item
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, unit, restock_threshold, supplier } = req.body;
  try {
    const query = `UPDATE inventory SET name=?, category=?, quantity=?, unit=?, restock_threshold=?, supplier=? WHERE id=?`;
    const result = await runAsync(query, [name, category, quantity, unit, restock_threshold, supplier, id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ updated: result.changes });
  } catch (err) {
    console.error('Failed to update item:', err.message);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE /inventory/:id -> delete an item
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await runAsync('DELETE FROM inventory WHERE id=?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ deleted: result.changes });
  } catch (err) {
    console.error('Failed to delete item:', err.message);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;

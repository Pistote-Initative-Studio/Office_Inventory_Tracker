import { openDB } from 'idb';

export async function getDB() {
  return openDB('office_inventory', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('inventory')) {
        const s = db.createObjectStore('inventory', { keyPath: 'id' });
        s.createIndex('name', 'name');
        s.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains('purchaseOrders')) {
        const s = db.createObjectStore('purchaseOrders', { keyPath: 'id' });
        s.createIndex('orderDate', 'orderDate');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    }
  });
}

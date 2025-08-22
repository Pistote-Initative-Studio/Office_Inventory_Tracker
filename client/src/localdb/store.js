import { getDB } from './indexedDb';

const uuid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export const Inventory = {
  async list() { return (await (await getDB()).getAll('inventory')); },
  async get(id) { return (await (await getDB()).get('inventory', id)); },
  async create(data) {
    const name = String(data?.name ?? '').trim();
    if (!name) throw new Error('Name is required');

    const rec = {
      id: uuid(),
      name,
      category: (data.category ?? '').trim(),
      quantity: Number(data.quantity ?? 0),
      unit: (data.unit ?? '').trim(),
      restock_threshold: Number(data.restock_threshold ?? 0),
      supplier: (data.supplier ?? '').trim(),
      location: (data.location ?? '').trim(),
      product_number: (data.product_number ?? '').trim(),
      last_price: data.last_price != null && data.last_price !== '' ? Number(data.last_price) : null,
    };

    const db = await getDB();
    await db.add('inventory', rec);
    return rec;
  },
  async update(id, patch) {
    const db = await getDB();
    const cur = await db.get('inventory', id);
    if (!cur) throw new Error('Not found');
    const rec = {
      ...cur,
      ...patch,
      name: patch?.name != null ? String(patch.name).trim() : cur.name,
      quantity: patch?.quantity != null ? Number(patch.quantity) : cur.quantity,
      restock_threshold: patch?.restock_threshold != null ? Number(patch.restock_threshold) : cur.restock_threshold,
      last_price: patch?.last_price != null && patch.last_price !== '' ? Number(patch.last_price) : cur.last_price,
    };
    await db.put('inventory', rec);
    return rec;
  },
  async remove(id) { await (await getDB()).delete('inventory', id); }
};

export const PurchaseOrders = {
  async list() { return (await (await getDB()).getAll('purchaseOrders')); },
  async listByDateRange(startISO, endISO) {
    const all = await this.list();
    const s = startISO ? new Date(startISO).getTime() : -Infinity;
    const e = endISO ? new Date(endISO).getTime() : Infinity;
    return all.filter(po => {
      const t = new Date(po.orderDate || po.last_modified || Date.now()).getTime();
      return t >= s && t <= e;
    });
  },
  async get(id) { return (await (await getDB()).get('purchaseOrders', id)); },
  async create(data) {
    const now = new Date().toISOString();
    const rec = {
      id: uuid(),
      orderDate: data.orderDate || now,
      supplier: data.supplier || '',
      notes: data.notes || '',
      items: Array.isArray(data.items) ? data.items : (data.orderItems || []),
      status: data.status || 'final',
      last_modified: now
    };
    await (await getDB()).add('purchaseOrders', rec);
    return rec;
  },
  async update(id, patch) {
    const db = await getDB();
    const cur = await db.get('purchaseOrders', id);
    if (!cur) throw new Error('Not found');
    const rec = { ...cur, ...patch, last_modified: new Date().toISOString() };
    await db.put('purchaseOrders', rec);
    return rec;
  },
  async remove(id) { await (await getDB()).delete('purchaseOrders', id); }
};

export const Settings = {
  async get(key) { return (await (await getDB()).get('settings', key)); },
  async set(key, value) { await (await getDB()).put('settings', { key, value }); }
};

export async function exportAll() {
  const db = await getDB();
  const inventory = await db.getAll('inventory');
  const purchaseOrders = await db.getAll('purchaseOrders');
  const settings = await db.getAll('settings');
  return { version: 1, exportedAt: new Date().toISOString(), inventory, purchaseOrders, settings };
}

export async function importAll(payload, { replace = true } = {}) {
  const db = await getDB();
  if (replace) {
    const tx = db.transaction(['inventory', 'purchaseOrders', 'settings'], 'readwrite');
    await tx.objectStore('inventory').clear();
    await tx.objectStore('purchaseOrders').clear();
    await tx.objectStore('settings').clear();
    await tx.done;
  }
  const tx = db.transaction(['inventory', 'purchaseOrders', 'settings'], 'readwrite');
  for (const r of payload.inventory || []) await tx.objectStore('inventory').put(r);
  for (const r of payload.purchaseOrders || []) await tx.objectStore('purchaseOrders').put(r);
  for (const r of payload.settings || []) await tx.objectStore('settings').put(r);
  await tx.done;
}

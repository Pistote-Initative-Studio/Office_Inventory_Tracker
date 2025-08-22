import { Inventory, PurchaseOrders } from './localdb/store';

function toPath(url) {
  try { const u = new URL(url, window.location.origin); return [u.pathname, u.searchParams]; }
  catch { const u = new URL(url, window.location.origin); return [u.pathname, u.searchParams]; }
}

function parseBody(b) {
  if (!b) return null;
  if (typeof b === 'string') { try { return JSON.parse(b); } catch { return null; } }
  if (b instanceof FormData) {
    const obj = {}; b.forEach((v, k) => { obj[k] = v; }); return obj;
  }
  if (typeof b === 'object') return b;
  return null;
}

export async function apiFetch(url, options = {}) {
  const local = process.env.REACT_APP_DATA_MODE === 'local';
  if (!local) {
    const headers = options.headers ? { ...options.headers } : {};
    return fetch(url, { ...options, headers });
  }

  const method = (options.method || 'GET').toUpperCase();
  const [pathname, sp] = toPath(url);
  const body = parseBody(options.body);

  try {
    // INVENTORY
    if (pathname === '/inventory' && method === 'GET') {
      let data = await Inventory.list();
      const q = (sp.get('search') || '').trim().toLowerCase();
      const cat = (sp.get('category') || '').trim();
      if (q) data = data.filter(r =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.product_number || '').toLowerCase().includes(q)
      );
      if (cat && cat !== 'All') data = data.filter(r => (r.category || '') === cat);
      return ok({ data });
    }
    if (pathname === '/inventory' && method === 'POST') {
      const rec = await Inventory.create(body || {});
      return ok({ data: rec });
    }
    const invId = pathname.match(/^\/inventory\/([^/?#]+)/)?.[1];
    if (invId) {
      if (method === 'GET') return ok({ data: await Inventory.get(invId) });
      if (method === 'PUT') return ok({ data: await Inventory.update(invId, body || {}) });
      if (method === 'DELETE') { await Inventory.remove(invId); return ok({ data: { deleted: 1 } }); }
    }

    // PURCHASE ORDERS + REPORTS (unchanged paths)
    if (pathname.startsWith('/api/purchase-orders')) {
      if (pathname === '/api/purchase-orders' && method === 'GET') {
        return ok({ data: await PurchaseOrders.list() });
      }
      if (pathname === '/api/purchase-orders' && method === 'POST') {
        return ok({ data: await PurchaseOrders.create(body) });
      }
      const poMatch = pathname.match(/^\/api\/purchase-orders\/([^/?#]+)/);
      if (poMatch) {
        const id = poMatch[1];
        if (method === 'PUT') return ok({ data: await PurchaseOrders.update(id, body) });
        if (method === 'DELETE') { await PurchaseOrders.remove(id); return ok({ data: { deleted: 1 } }); }
      }
    }

    if (pathname.startsWith('/api/reports/purchase-orders')) {
      const startDate = sp.get('startDate') || '';
      const endDate = sp.get('endDate') || '';
      const data = await PurchaseOrders.listByDateRange(startDate, endDate);
      return ok({ data });
    }

    return fail(`Unknown local endpoint: ${pathname}`);
  } catch (e) {
    console.error('Local API error', pathname, e);
    return fail(e.message || 'Local API error');
  }
}

function ok(payload)  { return { ok: true,  json: async () => ({ success: true,  ...payload }) }; }
function fail(error)  { return { ok: false, json: async () => ({ success: false, error }) }; }


import { Inventory, PurchaseOrders } from './localdb/store';

function normalizePath(url) {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + (u.search || '');
  } catch {
    return url; // assume already a path
  }
}

export async function apiFetch(url, options = {}) {
  const local = process.env.REACT_APP_DATA_MODE === 'local';
  const path = normalizePath(url);
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;
  const u = new URL(path, window.location.origin);
  const pathname = u.pathname;
  const sp = u.searchParams;

  if (!local) {
    const headers = options.headers ? { ...options.headers } : {};
    return fetch(url, { ...options, headers });
  }

  try {
    // Inventory endpoints
    if (pathname === '/inventory' && method === 'GET') {
      let data = await Inventory.list();
      const q = (sp.get('search') || '').trim().toLowerCase();
      const cat = (sp.get('category') || '').trim();
      if (q) {
        data = data.filter(
          (r) =>
            (r.name || '').toLowerCase().includes(q) ||
            (r.product_number || '').toLowerCase().includes(q)
        );
      }
      if (cat && cat !== 'All') {
        data = data.filter((r) => (r.category || '') === cat);
      }
      return ok({ data });
    }
    if (pathname === '/inventory' && method === 'POST') {
      const rec = await Inventory.create(body);
      return ok({ data: rec });
    }
    const invIdMatch = pathname.match(/^\/inventory\/([^/?#]+)/);
    if (invIdMatch) {
      const id = invIdMatch[1];
      if (method === 'GET') return ok({ data: await Inventory.get(id) });
      if (method === 'PUT') return ok({ data: await Inventory.update(id, body) });
      if (method === 'DELETE') { await Inventory.remove(id); return ok({ data: { deleted: 1 } }); }
    }

    // Purchase Orders (Reports read from here too)
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

    // Reports (date-filtered POs)
    if (pathname.startsWith('/api/reports/purchase-orders')) {
      const startDate = sp.get('startDate') || '';
      const endDate = sp.get('endDate') || '';
      const data = await PurchaseOrders.listByDateRange(startDate, endDate);
      return ok({ data });
    }

    return fail('Unknown local endpoint: ' + pathname);
  } catch (e) {
    return fail(e.message || 'Local API error');
  }
}

function ok(payload) {
  return { ok: true, json: async () => ({ success: true, ...payload }) };
}
function fail(msg) {
  return { ok: false, json: async () => ({ success: false, error: msg }) };
}

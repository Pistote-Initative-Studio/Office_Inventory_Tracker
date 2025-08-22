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

  if (!local) {
    const headers = options.headers ? { ...options.headers } : {};
    return fetch(url, { ...options, headers });
  }

  try {
    // Inventory endpoints
    if (path === '/inventory' && method === 'GET') {
      const data = await Inventory.list();
      return ok({ data });
    }
    if (path === '/inventory' && method === 'POST') {
      const rec = await Inventory.create(body);
      return ok({ data: rec });
    }
    const invIdMatch = path.match(/^\/inventory\/([^/?#]+)/);
    if (invIdMatch) {
      const id = invIdMatch[1];
      if (method === 'GET') return ok({ data: await Inventory.get(id) });
      if (method === 'PUT') return ok({ data: await Inventory.update(id, body) });
      if (method === 'DELETE') { await Inventory.remove(id); return ok({ data: { deleted: 1 } }); }
    }

    // Purchase Orders (Reports read from here too)
    if (path.startsWith('/api/purchase-orders')) {
      if (path === '/api/purchase-orders' && method === 'GET') {
        return ok({ data: await PurchaseOrders.list() });
      }
      if (path === '/api/purchase-orders' && method === 'POST') {
        return ok({ data: await PurchaseOrders.create(body) });
      }
      const poMatch = path.match(/^\/api\/purchase-orders\/([^/?#]+)/);
      if (poMatch) {
        const id = poMatch[1];
        if (method === 'PUT') return ok({ data: await PurchaseOrders.update(id, body) });
        if (method === 'DELETE') { await PurchaseOrders.remove(id); return ok({ data: { deleted: 1 } }); }
      }
    }

    // Reports (date-filtered POs)
    if (path.startsWith('/api/reports/purchase-orders')) {
      const urlObj = new URL(path, window.location.origin);
      const startDate = urlObj.searchParams.get('startDate') || '';
      const endDate = urlObj.searchParams.get('endDate') || '';
      const data = await PurchaseOrders.listByDateRange(startDate, endDate);
      return ok({ data });
    }

    return fail('Unknown local endpoint: ' + path);
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

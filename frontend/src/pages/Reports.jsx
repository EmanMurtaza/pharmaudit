import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const today = () => new Date().toISOString().slice(0, 10);

// Build and download a CSV file from an array of objects
function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => {
        const val = r[h] == null ? '' : String(r[h]);
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SummaryCard({ label, value, sub, color = 'blue' }) {
  const ring = { blue: 'border-blue-200 text-blue-700 bg-blue-50', green: 'border-emerald-200 text-emerald-700 bg-emerald-50', purple: 'border-purple-200 text-purple-700 bg-purple-50' };
  return (
    <div className={`card border ${ring[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Inventory Report ─── */
function InventoryReport() {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/inventory')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  const totalValue  = data.reduce((s, m) => s + m.purchase_price * m.quantity, 0);
  const totalRetail = data.reduce((s, m) => s + m.selling_price  * m.quantity, 0);
  const totalProfit = totalRetail - totalValue;

  function doExport() {
    exportCSV(
      data.map((m) => ({
        Name:           m.name,
        'Batch Number': m.batch_number,
        'Expiry Date':  m.expiry_date,
        Quantity:       m.quantity,
        'Purchase Price': m.purchase_price.toFixed(2),
        'Selling Price':  m.selling_price.toFixed(2),
        'Total Value (Purchase)': (m.purchase_price * m.quantity).toFixed(2),
        'Total Value (Retail)':   (m.selling_price  * m.quantity).toFixed(2),
      })),
      `inventory-report-${today()}.csv`
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Products"      value={data.length}                               color="blue"   />
        <SummaryCard label="Stock Value"   value={`PKR ${totalValue.toFixed(0)}`}            color="blue"   />
        <SummaryCard label="Retail Value"  value={`PKR ${totalRetail.toFixed(0)}`}           color="green"  />
        <SummaryCard label="Potential Profit" value={`PKR ${totalProfit.toFixed(0)}`}        color="purple" />
      </div>

      <div className="flex justify-end">
        <button onClick={doExport} disabled={!data.length} className="btn-success">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Export CSV
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Medicine</th>
                <th className="table-th">Batch</th>
                <th className="table-th">Expiry</th>
                <th className="table-th">Qty</th>
                <th className="table-th">Purchase</th>
                <th className="table-th">Selling</th>
                <th className="table-th">Stock Value</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="table-td text-center text-gray-400 py-10">Loading…</td></tr>
              ) : data.map((m) => {
                const days = Math.round((new Date(m.expiry_date) - new Date()) / 86400000);
                const statusBadge =
                  days < 0       ? <span className="badge-red">Expired</span>    :
                  days <= 60     ? <span className="badge-yellow">Expiring</span> :
                  m.quantity === 0 ? <span className="badge-red">No stock</span>  :
                  m.quantity < 10  ? <span className="badge-yellow">Low stock</span> :
                  <span className="badge-green">OK</span>;
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium text-gray-900">{m.name}</td>
                    <td className="table-td text-gray-500">{m.batch_number || '—'}</td>
                    <td className="table-td text-gray-600">{m.expiry_date}</td>
                    <td className="table-td">{m.quantity}</td>
                    <td className="table-td">PKR {m.purchase_price.toFixed(2)}</td>
                    <td className="table-td">PKR {m.selling_price.toFixed(2)}</td>
                    <td className="table-td font-semibold">PKR {(m.purchase_price * m.quantity).toFixed(2)}</td>
                    <td className="table-td">{statusBadge}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Sales Report ─── */
function SalesReport() {
  const [startDate, setStartDate] = useState(today());
  const [endDate,   setEndDate]   = useState(today());
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const res = await api.get(`/reports/sales?${p}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  function doExport() {
    if (!data?.sales?.length) return;
    exportCSV(
      data.sales.map((s) => ({
        'Sale Date':    s.sale_date,
        Medicine:       s.medicine_name,
        'Qty Sold':     s.quantity_sold,
        'Unit Price':   s.selling_price.toFixed(2),
        'Total Revenue': (s.selling_price * s.quantity_sold).toFixed(2),
        'Purchase Price': s.purchase_price.toFixed(2),
        Profit:         s.profit.toFixed(2),
      })),
      `sales-report-${startDate}-to-${endDate}.csv`
    );
  }

  const { sales = [], summary = {} } = data || {};

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-auto" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-auto" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <button onClick={load} className="btn-secondary">Apply</button>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SummaryCard label="Transactions"   value={summary.totalTransactions}                color="blue"   />
          <SummaryCard label="Total Revenue"  value={`PKR ${(summary.totalRevenue  || 0).toFixed(2)}`} color="green"  />
          <SummaryCard label="Total Profit"   value={`PKR ${(summary.totalProfit   || 0).toFixed(2)}`} color="purple" />
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={doExport} disabled={!sales.length} className="btn-success">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Export CSV
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Date / Time</th>
                <th className="table-th">Medicine</th>
                <th className="table-th">Qty</th>
                <th className="table-th">Unit Price</th>
                <th className="table-th">Revenue</th>
                <th className="table-th">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="table-td text-center text-gray-400 py-10">Loading…</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={6} className="table-td text-center text-gray-400 py-10">No sales in this period.</td></tr>
              ) : sales.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-td text-xs text-gray-500">{s.sale_date}</td>
                  <td className="table-td font-medium text-gray-900">{s.medicine_name}</td>
                  <td className="table-td">{s.quantity_sold}</td>
                  <td className="table-td">PKR {s.selling_price.toFixed(2)}</td>
                  <td className="table-td font-semibold">PKR {(s.selling_price * s.quantity_sold).toFixed(2)}</td>
                  <td className="table-td">
                    <span className={s.profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                      PKR {s.profit.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {sales.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="table-td font-semibold text-gray-700" colSpan={4}>Total</td>
                  <td className="table-td font-bold text-gray-900">PKR {(summary.totalRevenue || 0).toFixed(2)}</td>
                  <td className="table-td font-bold text-emerald-600">PKR {(summary.totalProfit || 0).toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Reports Page ─── */
export default function Reports() {
  const [tab, setTab] = useState('inventory');

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Reports</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'inventory', label: 'Inventory Report' },
          { id: 'sales',     label: 'Sales Report'     },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory' ? <InventoryReport /> : <SalesReport />}
    </div>
  );
}

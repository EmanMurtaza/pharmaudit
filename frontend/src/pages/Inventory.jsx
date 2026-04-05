import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const EMPTY_FORM = {
  name: '', batch_number: '', expiry_date: '',
  quantity: '', purchase_price: '', selling_price: '',
};

function daysUntilExpiry(dateStr) {
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.round((expiry - today) / 86400000);
}

function ExpiryBadge({ date }) {
  const days = daysUntilExpiry(date);
  if (days < 0)        return <span className="badge-red">Expired</span>;
  if (days <= 30)      return <span className="badge-red">{days}d left</span>;
  if (days <= 60)      return <span className="badge-yellow">{days}d left</span>;
  return <span className="badge-green">OK</span>;
}

function StockBadge({ qty }) {
  if (qty === 0)   return <span className="badge-red">Out of stock</span>;
  if (qty < 10)    return <span className="badge-yellow">{qty}</span>;
  return <span className="badge-green">{qty}</span>;
}

// Modal form for add / edit
function MedicineModal({ medicine, onClose, onSaved }) {
  const [form,    setForm]    = useState(medicine ? { ...medicine } : { ...EMPTY_FORM });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        quantity:       Number(form.quantity),
        purchase_price: Number(form.purchase_price),
        selling_price:  Number(form.selling_price),
      };
      const res = medicine
        ? await api.put(`/medicines/${medicine.id}`, payload)
        : await api.post('/medicines', payload);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">{medicine ? 'Edit Medicine' : 'Add Medicine'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Medicine Name *</label>
              <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Panadol 500mg" required />
            </div>
            <div>
              <label className="label">Batch Number</label>
              <input className="input" value={form.batch_number} onChange={set('batch_number')} placeholder="e.g. BN-2024-001" />
            </div>
            <div>
              <label className="label">Expiry Date *</label>
              <input type="date" className="input" value={form.expiry_date} onChange={set('expiry_date')} required />
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input type="number" min="0" className="input" value={form.quantity} onChange={set('quantity')} placeholder="0" required />
            </div>
            <div />
            <div>
              <label className="label">Purchase Price (PKR) *</label>
              <input type="number" min="0" step="0.01" className="input" value={form.purchase_price} onChange={set('purchase_price')} placeholder="0.00" required />
            </div>
            <div>
              <label className="label">Selling Price (PKR) *</label>
              <input type="number" min="0" step="0.01" className="input" value={form.selling_price} onChange={set('selling_price')} placeholder="0.00" required />
            </div>
          </div>

          {/* Margin preview */}
          {form.purchase_price && form.selling_price && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              Margin per unit:&nbsp;
              <span className={Number(form.selling_price) >= Number(form.purchase_price) ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                PKR {(Number(form.selling_price) - Number(form.purchase_price)).toFixed(2)}
              </span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : medicine ? 'Update' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Confirm delete dialog
function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Delete Medicine</h2>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete <strong>{name}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel}  className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [medicines,  setMedicines]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [modal,      setModal]      = useState(null);  // null | 'add' | medicine object
  const [delTarget,  setDelTarget]  = useState(null);  // medicine to delete
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search)         params.set('search', search);
      if (filter !== 'all') params.set('filter', filter);
      const res = await api.get(`/medicines?${params}`);
      if (!res.ok) throw new Error('Failed to load inventory');
      setMedicines(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    await api.delete(`/medicines/${id}`);
    setDelTarget(null);
    load();
  }

  const FILTERS = [
    { id: 'all',       label: 'All' },
    { id: 'expiring',  label: 'Expiring Soon' },
    { id: 'low_stock', label: 'Low Stock' },
    { id: 'expired',   label: 'Expired' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{medicines.length} item{medicines.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          Add Medicine
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
          </svg>
          <input
            className="input pl-9"
            placeholder="Search medicines…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                filter === f.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Medicine</th>
                <th className="table-th">Batch</th>
                <th className="table-th">Expiry</th>
                <th className="table-th">Stock</th>
                <th className="table-th">Purchase</th>
                <th className="table-th">Selling</th>
                <th className="table-th">Margin</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="table-td text-center text-gray-400 py-10">Loading…</td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-td text-center text-gray-400 py-10">
                    {search || filter !== 'all' ? 'No medicines match your search.' : 'No medicines yet. Click "Add Medicine" to get started.'}
                  </td>
                </tr>
              ) : (
                medicines.map((m) => {
                  const days   = daysUntilExpiry(m.expiry_date);
                  const margin = m.selling_price - m.purchase_price;
                  const rowBg  = days < 0 ? 'bg-red-50/50' : days <= 60 ? 'bg-amber-50/30' : '';
                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${rowBg}`}>
                      <td className="table-td font-medium text-gray-900">{m.name}</td>
                      <td className="table-td text-gray-500">{m.batch_number || '—'}</td>
                      <td className="table-td">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-600 text-xs">{m.expiry_date}</span>
                          <ExpiryBadge date={m.expiry_date} />
                        </div>
                      </td>
                      <td className="table-td"><StockBadge qty={m.quantity} /></td>
                      <td className="table-td">PKR {m.purchase_price.toFixed(2)}</td>
                      <td className="table-td">PKR {m.selling_price.toFixed(2)}</td>
                      <td className="table-td">
                        <span className={margin >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                          PKR {margin.toFixed(2)}
                        </span>
                      </td>
                      <td className="table-td text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setModal(m)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => setDelTarget(m)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <MedicineModal
          medicine={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
      {delTarget && (
        <ConfirmDialog
          name={delTarget.name}
          onConfirm={() => handleDelete(delTarget.id)}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}

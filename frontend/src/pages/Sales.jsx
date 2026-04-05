import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const today = () => new Date().toISOString().slice(0, 10);

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 2 }).format(n);

export default function Sales() {
  const [medicines, setMedicines] = useState([]);
  const [sales,     setSales]     = useState([]);
  const [date,      setDate]      = useState(today());
  const [form,      setForm]      = useState({ medicine_id: '', quantity_sold: '', selling_price: '' });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  // Load medicines for the dropdown
  useEffect(() => {
    api.get('/medicines')
      .then((r) => r.json())
      .then(setMedicines)
      .catch(() => {});
  }, []);

  const loadSales = useCallback(async () => {
    try {
      const res = await api.get(`/sales?date=${date}`);
      setSales(await res.json());
    } catch {}
  }, [date]);

  useEffect(() => { loadSales(); }, [loadSales]);

  // When medicine is selected, pre-fill selling price
  function onMedicineChange(e) {
    const id  = e.target.value;
    const med = medicines.find((m) => String(m.id) === id);
    setForm((f) => ({
      ...f,
      medicine_id:   id,
      selling_price: med ? String(med.selling_price) : '',
    }));
  }

  async function handleSale(e) {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const res = await api.post('/sales', {
        medicine_id:   Number(form.medicine_id),
        quantity_sold: Number(form.quantity_sold),
        selling_price: Number(form.selling_price),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Sale recorded — PKR ${(data.selling_price * data.quantity_sold).toFixed(2)} · Profit: PKR ${data.profit.toFixed(2)}`);
      setForm({ medicine_id: '', quantity_sold: '', selling_price: '' });
      loadSales();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Derive selected medicine for quick info
  const selectedMed = medicines.find((m) => String(m.id) === String(form.medicine_id));

  // Daily totals
  const totalRevenue = sales.reduce((s, r) => s + r.selling_price * r.quantity_sold, 0);
  const totalProfit  = sales.reduce((s, r) => s + r.profit, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Sales</h1>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Sale form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Record a Sale</h2>
            <form onSubmit={handleSale} className="space-y-4">
              {error   && <p className="text-sm text-red-600   bg-red-50   border border-red-200   rounded-lg px-3 py-2">{error}</p>}
              {success && <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

              <div>
                <label className="label">Medicine *</label>
                <select className="input" value={form.medicine_id} onChange={onMedicineChange} required>
                  <option value="">— Select medicine —</option>
                  {medicines
                    .filter((m) => m.quantity > 0)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.batch_number ? `(${m.batch_number})` : ''} — {m.quantity} left
                      </option>
                    ))}
                </select>
                {medicines.filter((m) => m.quantity === 0).length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {medicines.filter((m) => m.quantity === 0).length} item(s) hidden (out of stock)
                  </p>
                )}
              </div>

              {/* Medicine info preview */}
              {selectedMed && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800 space-y-0.5">
                  <p><span className="font-semibold">Stock:</span> {selectedMed.quantity} units</p>
                  <p><span className="font-semibold">Purchase price:</span> PKR {selectedMed.purchase_price.toFixed(2)}</p>
                  <p><span className="font-semibold">Expiry:</span> {selectedMed.expiry_date}</p>
                </div>
              )}

              <div>
                <label className="label">Quantity Sold *</label>
                <input
                  type="number" min="1"
                  max={selectedMed ? selectedMed.quantity : undefined}
                  className="input"
                  value={form.quantity_sold}
                  onChange={(e) => setForm((f) => ({ ...f, quantity_sold: e.target.value }))}
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <label className="label">Selling Price per Unit (PKR) *</label>
                <input
                  type="number" min="0" step="0.01"
                  className="input"
                  value={form.selling_price}
                  onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Profit preview */}
              {selectedMed && form.quantity_sold && form.selling_price && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs space-y-0.5">
                  <p className="text-gray-600">
                    Total: <span className="font-semibold text-gray-800">PKR {(Number(form.selling_price) * Number(form.quantity_sold)).toFixed(2)}</span>
                  </p>
                  <p className="text-gray-600">
                    Profit: <span className={`font-semibold ${(Number(form.selling_price) - selectedMed.purchase_price) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      PKR {((Number(form.selling_price) - selectedMed.purchase_price) * Number(form.quantity_sold)).toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Recording…' : 'Record Sale'}
              </button>
            </form>
          </div>
        </div>

        {/* Sales log */}
        <div className="lg:col-span-3 space-y-4">
          {/* Date selector + summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="label mb-0 whitespace-nowrap">Sales for:</label>
              <input
                type="date"
                className="input w-auto"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            {sales.length > 0 && (
              <div className="text-right text-sm">
                <p className="text-gray-500">Revenue: <span className="font-semibold text-gray-800">{fmt(totalRevenue)}</span></p>
                <p className="text-gray-500">Profit:  <span className="font-semibold text-emerald-600">{fmt(totalProfit)}</span></p>
              </div>
            )}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-th">Medicine</th>
                    <th className="table-th">Qty</th>
                    <th className="table-th">Unit Price</th>
                    <th className="table-th">Total</th>
                    <th className="table-th">Profit</th>
                    <th className="table-th">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-td text-center text-gray-400 py-10">
                        No sales recorded for this date.
                      </td>
                    </tr>
                  ) : (
                    sales.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td font-medium text-gray-900">{s.medicine_name}</td>
                        <td className="table-td">{s.quantity_sold}</td>
                        <td className="table-td">PKR {s.selling_price.toFixed(2)}</td>
                        <td className="table-td font-semibold">PKR {(s.selling_price * s.quantity_sold).toFixed(2)}</td>
                        <td className="table-td">
                          <span className={s.profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                            PKR {s.profit.toFixed(2)}
                          </span>
                        </td>
                        <td className="table-td text-gray-400 text-xs">
                          {new Date(s.sale_date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {sales.length > 0 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="table-td font-semibold text-gray-700" colSpan={3}>
                        Total ({sales.length} transaction{sales.length !== 1 ? 's' : ''})
                      </td>
                      <td className="table-td font-bold text-gray-900">{fmt(totalRevenue)}</td>
                      <td className="table-td font-bold text-emerald-600">{fmt(totalProfit)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

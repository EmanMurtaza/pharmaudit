import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

function StatCard({ label, value, sub, color }) {
  const colors = {
    blue:   'bg-blue-50  border-blue-200  text-blue-700',
    green:  'bg-emerald-50 border-emerald-200 text-emerald-700',
    yellow: 'bg-amber-50  border-amber-200  text-amber-700',
    red:    'bg-red-50    border-red-200    text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`card border ${colors[color]} flex flex-col gap-1`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

function AlertRow({ icon, children, variant }) {
  const styles = {
    red:    'bg-red-50    border-red-200    text-red-800',
    yellow: 'bg-amber-50  border-amber-200  text-amber-800',
  };
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-sm ${styles[variant]}`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

// Days between today and an expiry date
function daysUntilExpiry(dateStr) {
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.round((expiry - today) / 86400000);
}

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/dashboard');
      if (!res.ok) throw new Error('Failed to load dashboard');
      setStats(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      Loading dashboard…
    </div>
  );

  if (error) return (
    <div className="text-center py-16 text-red-500">
      <p className="font-medium">{error}</p>
      <button onClick={load} className="btn-primary mt-4">Retry</button>
    </div>
  );

  const {
    inventoryValue, totalMedicines,
    expiringSoon, expired, lowStock, outOfStock,
    todayRevenue, todayProfit, todaySalesCount,
    expiringSoonList, lowStockList,
  } = stats;

  const alertCount = expiringSoon + expired + lowStock + outOfStock;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-xs">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0114.13-3.36M20 15A9 9 0 015.87 18.36"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Inventory Value"   value={fmt(inventoryValue)} sub={`${totalMedicines} products`} color="blue"   />
        <StatCard label="Today's Revenue"   value={fmt(todayRevenue)}   sub={`${todaySalesCount} sale(s)`}  color="green"  />
        <StatCard label="Today's Profit"    value={fmt(todayProfit)}    sub="gross profit"                  color="purple" />
        <StatCard label="Active Alerts"     value={alertCount}          sub="need attention"                color={alertCount > 0 ? 'red' : 'green'} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Expiring (60d)',  value: expiringSoon, color: 'badge-yellow' },
          { label: 'Expired',        value: expired,      color: 'badge-red'    },
          { label: 'Low Stock',      value: lowStock,     color: 'badge-yellow' },
          { label: 'Out of Stock',   value: outOfStock,   color: 'badge-red'    },
        ].map((s) => (
          <div key={s.label} className="card flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">{s.label}</span>
            <span className={s.color}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Alert panels */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Expiring soon */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Expiring Within 60 Days
            {expiringSoon > 0 && <span className="badge-yellow ml-auto">{expiringSoon}</span>}
          </h2>
          {expiringSoonList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No medicines expiring soon.</p>
          ) : (
            <div className="space-y-2">
              {expiringSoonList.map((m) => {
                const days = daysUntilExpiry(m.expiry_date);
                return (
                  <AlertRow key={m.id} icon="⚠️" variant={days <= 30 ? 'red' : 'yellow'}>
                    <span className="font-semibold">{m.name}</span>
                    {m.batch_number && <span className="text-xs opacity-70"> · Batch {m.batch_number}</span>}
                    <span className="ml-1 text-xs">— expires in <b>{days}</b> day{days !== 1 ? 's' : ''}</span>
                    <span className="ml-1 text-xs opacity-70">({m.quantity} units left)</span>
                  </AlertRow>
                );
              })}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            Low Stock
            {lowStock > 0 && <span className="badge-red ml-auto">{lowStock}</span>}
          </h2>
          {lowStockList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">All items are well stocked.</p>
          ) : (
            <div className="space-y-2">
              {lowStockList.map((m) => (
                <AlertRow key={m.id} icon="📦" variant={m.quantity <= 3 ? 'red' : 'yellow'}>
                  <span className="font-semibold">{m.name}</span>
                  <span className="ml-1 text-xs">— only <b>{m.quantity}</b> unit{m.quantity !== 1 ? 's' : ''} remaining</span>
                </AlertRow>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

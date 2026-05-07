// src/PartidasExplorer.jsx

import React, { useState, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, X, Building2, Tag, Banknote,
  Clock, TrendingUp, FileText, Hash, Layers, Download,
  BarChart3, Percent
} from 'lucide-react';

// ╭──────────────── CONFIG ────────────────╮
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fetch directo para evitar límite de 1000 del cliente Supabase
const fetchAllPartidas = async () => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/partidas?select=*&order=obra.asc&limit=10000`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'count=exact',
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const total = parseInt(response.headers.get('content-range')?.split('/')[1] || '0', 10);
  return { data, total: total || data?.length || 0 };
};

const ITEMS_PER_PAGE = 30;
const PAGE_BUTTONS = 5;
// ╰─────────────────────────────────────────╯

// ╭──────────────── FORMAT HELPERS ──────────╮

const fmt = (v) => v != null ? v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '€' : '–';
const fmtHours = (v) => v != null ? v.toFixed(2) + 'h' : '–';
const fmtPct = (v) => v != null ? v.toFixed(0) + '%' : '–';
const fmtUnit = (v) => v != null ? `${v.toFixed(2)} €/${v === 'ud' ? '' : ''}` : '–';

const UNIT_COLORS = {
  'ud': 'bg-blue-100 text-blue-700',
  'm': 'bg-green-100 text-green-700',
  'm2': 'bg-green-100 text-green-700',
  'm3': 'bg-green-100 text-green-700',
  'ml': 'bg-green-100 text-green-700',
  'kg': 'bg-yellow-100 text-yellow-700',
  't': 'bg-yellow-100 text-yellow-700',
  'modulo': 'bg-purple-100 text-purple-700',
  'pa': 'bg-orange-100 text-orange-700',
  'planta': 'bg-teal-100 text-teal-700',
  'tramo': 'bg-indigo-100 text-indigo-700',
  'partida': 'bg-pink-100 text-pink-700',
  'taller': 'bg-rose-100 text-rose-700',
  'unidades': 'bg-cyan-100 text-cyan-700',
};

const unitBadge = (unit) => {
  const cls = UNIT_COLORS[unit?.toLowerCase()] || 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{unit || '–'}</span>;
};

// ╰──────────────────────────────────────────╯

// ╭──────────────── STAT CARDS ──────────────╮

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </div>
  </div>
);

// ╰───────────────────────────────────────────╯

// ╭──────────────── MAIN COMPONENT ───────────╮

const PartidasExplorer = () => {
  // ── Data ──
  const [allPartidas, setAllPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [filterObra, setFilterObra] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterRange, setFilterRange] = useState({ minVenta: '', maxVenta: '' });
  const [showFilters, setShowFilters] = useState(false);

  // ── Sort ──
  const [sortCol, setSortCol] = useState('code');
  const [sortDir, setSortDir] = useState('asc');

  // ── Pagination ──
  const [page, setPage] = useState(1);

  // ── Fetch data ──
  React.useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data, error, total } = await fetchAllPartidas();
        if (error) throw error;
        setAllPartidas(data || []);
        console.log('Total partidas cargadas:', data?.length);
      } catch (err) {
        console.error('Error fetching partidas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // ── Unique values for filters ──
  const { obras, units, stats } = useMemo(() => {
    const obraSet = new Set();
    const unitSet = new Set();
    let totalVenta = 0, totalCoste = 0, count = 0, maxAvance = 0;

    // Filtrar datos corruptos (precios > 1M son probablemente erróneos)
    const cleanPartidas = allPartidas.filter(p => 
      !(p.venta_unit != null && p.venta_unit > 1000000)
    );

    cleanPartidas.forEach(p => {
      obraSet.add(p.obra);
      unitSet.add(p.unit);
      count++;
      totalVenta += p.venta_unit || 0;
      totalCoste += p.coste_unit || 0;
      if (p.avance_pct > maxAvance && p.avance_pct <= 100) maxAvance = p.avance_pct;
      if (p.avance_pct > 100) maxAvance = 100;
    });

    return {
      obras: Array.from(obraSet).sort(),
      units: Array.from(unitSet).sort(),
      stats: {
        total: count,
        avgVenta: count ? totalVenta / count : 0,
        avgCoste: count ? totalCoste / count : 0,
        maxAvance,
      }
    };
  }, [allPartidas]);

  // ── Filtered + Sorted ──
  const filtered = useMemo(() => {
    // Filtrar datos corruptos
    let result = allPartidas.filter(p => !(p.venta_unit != null && p.venta_unit > 1000000));
    // Normalizar avance > 100 a 100
    result = result.map(p => ({ ...p, avance_pct: p.avance_pct > 100 ? 100 : p.avance_pct }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        (p.desc_pre || '').toLowerCase().includes(q) ||
        (p.desc_ppy || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q)
      );
    }
    if (filterObra) {
      result = result.filter(p => p.obra === filterObra);
    }
    if (filterUnit) {
      result = result.filter(p => p.unit === filterUnit);
    }
    if (filterRange.minVenta) {
      result = result.filter(p => (p.venta_unit || 0) >= parseFloat(filterRange.minVenta));
    }
    if (filterRange.maxVenta) {
      result = result.filter(p => (p.venta_unit || 0) <= parseFloat(filterRange.maxVenta));
    }

    result.sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allPartidas, search, filterObra, filterUnit, filterRange, sortCol, sortDir]);

  // ── Paginated ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // ── Handlers ──
  const handleSort = useCallback((col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }, [sortCol]);

  const clearFilters = () => {
    setSearch('');
    setFilterObra('');
    setFilterUnit('');
    setFilterRange({ minVenta: '', maxVenta: '' });
  };

  const activeFilterCount = [search, filterObra, filterUnit].filter(Boolean).length +
    (filterRange.minVenta || filterRange.maxVenta ? 1 : 0);

  // ── Render ──
  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Layers className="w-7 h-7 text-blue-500" />
            Explorador de Partidas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {allPartidas.length} partidas indexadas en Supabase
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all border ${
            showFilters
              ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="bg-white/20 text-xs font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* ── Stats ── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={FileText} label="Partidas" value={stats.total.toLocaleString()} color="bg-blue-500" />
          <StatCard icon={Banknote} label="Precio/ud medio" value={fmt(stats.avgVenta)} color="bg-green-500" />
          <StatCard icon={TrendingUp} label="Coste/ud medio" value={fmt(stats.avgCoste)} color="bg-orange-500" />
          <StatCard icon={Percent} label="Avance máximo" value={fmtPct(stats.maxAvance)} color="bg-purple-500" />
        </div>
      )}

      {/* ── Filters Panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Obra */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    <Building2 className="w-3.5 h-3.5 inline mr-1" /> Obra
                  </label>
                  <select
                    value={filterObra}
                    onChange={e => setFilterObra(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  >
                    <option value="">Todas las obras</option>
                    {obras.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {/* Unidad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    <Tag className="w-3.5 h-3.5 inline mr-1" /> Unidad
                  </label>
                  <select
                    value={filterUnit}
                    onChange={e => setFilterUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  >
                    <option value="">Todas</option>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Precio min */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    <Banknote className="w-3.5 h-3.5 inline mr-1" /> Precio mín. (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={filterRange.minVenta}
                    onChange={e => setFilterRange({ ...filterRange, minVenta: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  />
                </div>

                {/* Precio max */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    <Banknote className="w-3.5 h-3.5 inline mr-1" /> Precio máx. (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="∞"
                    value={filterRange.maxVenta}
                    onChange={e => setFilterRange({ ...filterRange, maxVenta: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-3 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar filtros ({activeFilterCount} activo{activeFilterCount !== 1 ? 's' : ''})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Cargando partidas...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-red-50 border border-red-200 rounded-xl p-8 max-w-md">
            <p className="text-red-600 font-semibold mb-2">Error de conexión</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {!loading && (
        <>
          {/* ── Search + Info ── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Buscar por código o descripción..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm transition-all shadow-sm"
              />
            </div>
            <span className="text-sm text-slate-500 font-medium bg-white px-4 py-2 rounded-xl border border-slate-200">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Table ── */}
          <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200/80 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  {[
                    { key: 'code', label: 'Código', icon: Hash, w: 'w-28' },
                    { key: 'desc_pre', label: 'Descripción', icon: FileText, w: 'w-[220px]' },
                    { key: 'desc_ppy', label: 'Descripción PPyGG', icon: FileText, w: 'w-[220px]' },
                    { key: 'unit', label: 'Unidad', icon: Tag, w: 'w-16' },
                    { key: 'venta_unit', label: 'Venta/ud', icon: Banknote, w: 'w-28' },
                    { key: 'coste_unit', label: 'Coste/ud', icon: Banknote, w: 'w-28' },
                    { key: 'mano_obra_unit', label: 'Mano Obra', icon: Clock, w: 'w-24' },
                    { key: 'horas_unit', label: 'Horas', icon: Clock, w: 'w-20' },
                    { key: 'avance_pct', label: 'Avance', icon: TrendingUp, w: 'w-20' },
                    { key: 'rentabilidad', label: 'Rent.', icon: BarChart3, w: 'w-20' },
                    { key: 'obra', label: 'Obra', icon: Building2, w: 'w-36' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none ${col.w}`}
                    >
                      <div className="flex items-center gap-1">
                        <col.icon className="w-3.5 h-3.5" />
                        {col.label}
                        {sortCol === col.key && (
                          sortDir === 'asc'
                            ? <ChevronUp className="w-3 h-3 text-blue-500" />
                            : <ChevronDown className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium">No se encontraron partidas</p>
                      <p className="text-xs mt-1">Prueba a cambiar los filtros</p>
                    </td>
                  </tr>
                ) : (
                  paginated.map((p, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.01 }}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-blue-600 font-semibold">{p.code}</td>
                      <td className="px-3 py-2.5 text-slate-700 max-w-[220px] truncate" title={p.desc_pre}>
                        {p.desc_pre || '–'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-[220px] truncate" title={p.desc_ppy}>
                        {p.desc_ppy || '–'}
                      </td>
                      <td className="px-3 py-2.5">{unitBadge(p.unit)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-800">{fmt(p.venta_unit)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{fmt(p.coste_unit)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">{fmt(p.mano_obra_unit)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">{fmtHours(p.horas_unit)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-slate-600">{fmtPct(p.avance_pct)}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-green-600">{fmt(p.rentabilidad)}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-xs truncate max-w-[140px]" title={p.obra}>
                        {p.obra}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">
                Página {safePage} de {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  className="px-2.5 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  ≪
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {(() => {
                  const start = Math.max(1, safePage - Math.floor(PAGE_BUTTONS / 2));
                  const end = Math.min(totalPages, start + PAGE_BUTTONS - 1);
                  const buttons = [];
                  for (let i = start; i <= end; i++) {
                    buttons.push(
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-9 h-9 text-sm rounded-lg font-medium transition-colors ${
                          i === safePage
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return buttons;
                })()}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-2 text-sm rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                >
                  ≫
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PartidasExplorer;

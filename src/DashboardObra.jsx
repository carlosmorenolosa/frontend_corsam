// src/DashboardObra.jsx

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, BarChart3, TrendingUp, DollarSign, Clock,
  AlertTriangle, CheckCircle, Layers, ArrowRight, X, Download,
  ChevronDown, ChevronUp, FileText, Percent, Banknote
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  ScatterChart, Scatter, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// ╭──────────────── CONFIG ────────────────╮
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const fetchAllPartidas = async () => {
  let allData = [];
  let offset = 0;
  const batchSize = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/partidas?select=*&order=obra.asc&limit=${batchSize}&offset=${offset}`;
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) break;
    const batch = await response.json();
    if (!batch.length) break;
    allData = [...allData, ...batch];
    if (batch.length < batchSize) break;
    offset += batchSize;
  }
  return allData;
};
// ╰─────────────────────────────────────────╯

// ╭──────────────── COLORS ─────────────────╮
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
// ╰──────────────────────────────────────────╯

// ╭──────────────── CALCULATIONS ───────────╮

function calcMetrics(partidas) {
  if (!partidas?.length) return null;

  const clean = partidas.filter(p => !(p.venta_unit != null && p.venta_unit > 1000000));

  const totalVenta = clean.reduce((s, p) => s + (p.venta_unit || 0), 0);
  const totalCoste = clean.reduce((s, p) => s + (p.coste_unit || 0), 0);
  const totalMaterial = clean.reduce((s, p) => s + (p.material_unit || 0), 0);
  const totalContrata = clean.reduce((s, p) => s + (p.contrata_unit || 0), 0);
  const totalManoObra = clean.reduce((s, p) => s + (p.mano_obra_unit || 0), 0);
  const totalHoras = clean.reduce((s, p) => s + (p.horas_unit || 0), 0);
  const totalRentabilidad = clean.reduce((s, p) => s + (p.rentabilidad || 0), 0);

  // --- Lógica de Estructura de Costes ---
  const calcStructure = (items) => {
    const totals = items.reduce((acc, p) => {
      acc.material += (p.material_unit || 0);
      acc.manoObra += (p.mano_obra_unit || 0);
      acc.contrata += (p.contrata_unit || 0);
      acc.otros += (p.coste_unit || 0) - (p.material_unit || 0) - (p.mano_obra_unit || 0) - (p.contrata_unit || 0);
      return acc;
    }, { material: 0, manoObra: 0, contrata: 0, otros: 0 });

    const total = totals.material + totals.manoObra + totals.contrata + totals.otros;
    if (total <= 0) return { material: 0, manoObra: 0, contrata: 0, otros: 0 };

    return {
      material: (totals.material / total) * 100,
      manoObra: (totals.manoObra / total) * 100,
      contrata: (totals.contrata / total) * 100,
      otros: (totals.otros / total) * 100,
    };
  };

  const currentStructure = calcStructure(clean);
  const globalStructure = calcStructure(partidas);
  // --------------------------------------

  const rentNegativas = clean.filter(p => (p.rentabilidad || 0) < 0);
  const rentAlta = clean.filter(p => (p.rentabilidad || 0) > 100);
  const rentMedia = clean.filter(p => (p.rentabilidad || 0) > 0 && (p.rentabilidad || 0) <= 100);
  const rentBaja = clean.filter(p => (p.rentabilidad || 0) >= 0 && (p.rentabilidad || 0) <= 10);

  const distributionData = [
    { name: 'Alta (>100€)', count: rentAlta.length, color: '#10b981' },
    { name: 'Media (0-100€)', count: rentMedia.length, color: '#3b82f6' },
    { name: 'Baja (0-10€)', count: rentBaja.length, color: '#f59e0b' },
    { name: 'Negativa (<0€)', count: rentNegativas.length, color: '#ef4444' },
  ].filter(d => d.count > 0);

  // Top 10 más rentables
  const top10Rentables = [...clean].sort((a, b) => (b.rentabilidad || 0) - (a.rentabilidad || 0)).slice(0, 10);

  const top10MasCaras = [...clean].sort((a, b) => (b.venta_unit || 0) - (a.venta_unit || 0)).slice(0, 10);
  const top10MenosRentables = [...clean].sort((a, b) => (a.rentabilidad || 0) - (b.rentabilidad || 0)).slice(0, 10);
  const top10MasHoras = [...clean].sort((a, b) => (b.horas_unit || 0) - (a.horas_unit || 0)).slice(0, 10);

  // Desglose por unidad de medida
  const porUnidad = {};
  clean.forEach(p => {
    const u = p.unit || 'ud';
    if (!porUnidad[u]) porUnidad[u] = { unit: u, count: 0, venta: 0, coste: 0 };
    porUnidad[u].count++;
    porUnidad[u].venta += p.venta_unit || 0;
    porUnidad[u].coste += p.coste_unit || 0;
  });

  // Top obras (si hay varias)
  const porObra = {};
  clean.forEach(p => {
    const o = p.obra || 'Sin obra';
    if (!porObra[o]) porObra[o] = { obra: o, count: 0, venta: 0, coste: 0 };
    porObra[o].count++;
    porObra[o].venta += p.venta_unit || 0;
    porObra[o].coste += p.coste_unit || 0;
  });

  return {
    totalPartidas: clean.length,
    totalVenta,
    totalCoste,
    totalMaterial,
    totalContrata,
    totalManoObra,
    totalHoras,
    totalRentabilidad,
    ahorro: totalVenta - totalCoste,
    ahorroPct: totalVenta > 0 ? ((totalVenta - totalCoste) / totalVenta * 100) : 0,
    rentabilidadMedia: clean.length > 0 ? totalRentabilidad / clean.length : 0,
    rentabilidadPorHora: totalHoras > 0 ? totalRentabilidad / totalHoras : 0,
    costeMedio: clean.length > 0 ? totalCoste / clean.length : 0,
    ventaMedio: clean.length > 0 ? totalVenta / clean.length : 0,
    partidasNegativas: rentNegativas.length,
    rentNegPct: clean.length > 0 ? (rentNegativas.length / clean.length * 100) : 0,
    rentAlta: rentAlta.length,
    currentStructure,
    globalStructure,
    distributionData,
    porUnidad: Object.values(porUnidad),
    porObra: Object.values(porObra),
    top10MasCaras: top10MasCaras.map(p => ({ code: p.code, desc: (p.desc_pre || '').substring(0, 40), venta: p.venta_unit, coste: p.coste_unit, rentabilidad: p.rentabilidad })),
    top10MenosRentables: top10MenosRentables.map(p => ({ code: p.code, desc: (p.desc_pre || '').substring(0, 40), venta: p.venta_unit, rentabilidad: p.rentabilidad })),
    top10MasHoras: top10MasHoras.map(p => ({ code: p.code, desc: (p.desc_pre || '').substring(0, 40), horas: p.horas_unit, horasUnit: p.horas_unit })),
    top10Rentables: top10Rentables.map(p => ({ code: p.code, desc: (p.desc_pre || '').substring(0, 40), venta: p.venta_unit, coste: p.coste_unit, rentabilidad: p.rentabilidad, unit: p.unit })),
  };
}

// ╰──────────────────────────────────────────╯

// ╭──────────────── STAT CARD ──────────────╮

const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trend === 'up' ? 'bg-green-100 text-green-600' : trend === 'down' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </motion.div>
);
// ╰──────────────────────────────────────────╯

// ╭──────────────── SINGLE WORK DASHBOARD ──╮

const SingleWorkDashboard = ({ metrics, obraName }) => {
  const costBreakdown = [
    { name: 'Material', value: metrics.totalMaterial, color: '#3b82f6' },
    { name: 'Mano Obra', value: metrics.totalManoObra, color: '#10b981' },
    { name: 'Subcontrata', value: metrics.totalContrata, color: '#f59e0b' },
  ].filter(c => c.value > 0);

  const porUnidadChart = metrics.porUnidad.map(p => ({
    name: p.unit,
    count: p.count,
    venta: p.venta,
    coste: p.coste,
  })).slice(0, 8);

  const top10Bar = metrics.top10MasCaras.map(p => ({
    name: p.code,
    venta: p.venta,
    coste: p.coste,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-6 h-6" />
          <h2 className="text-2xl font-bold">{obraName}</h2>
        </div>
        <p className="text-blue-100 text-sm">{metrics.totalPartidas} partidas analizadas</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Presupuesto Total"
          value={`${metrics.totalVenta.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`}
          sub={`${metrics.totalPartidas} partidas`}
          color="text-blue-700"
          trend="up"
        />
        <StatCard
          icon={TrendingUp}
          label="Beneficio Obtenido"
          value={`${metrics.ahorro.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`}
          sub={`${metrics.ahorroPct.toFixed(1)}% del presupuesto`}
          color={metrics.ahorro > 0 ? 'text-green-700' : 'text-red-700'}
          trend={metrics.ahorro > 0 ? 'up' : 'down'}
        />
        <StatCard
          icon={Clock}
          label="Horas Totales"
          value={`${metrics.totalHoras.toLocaleString('es-ES', { minimumFractionDigits: 1 })} h`}
          sub={`${metrics.rentabilidadPorHora.toFixed(2)} €/h`}
          color="text-purple-700"
          trend="up"
        />
        <StatCard
          icon={AlertTriangle}
          label="Partidas Negativas"
          value={`${metrics.partidasNegativas}`}
          sub={`${metrics.rentNegPct.toFixed(1)}% del total`}
          color="text-red-700"
          trend="down"
        />
      </div>

      {/* Cost Breakdown + Por Unidad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Desglose de Costes
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {costBreakdown.map((c, i) => (
              <div key={i} className="text-xs">
                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: c.color }} />
                <p className="font-semibold text-slate-700">{c.name}</p>
                <p className="text-slate-500">{c.value.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-green-500" />
            Por Unidad de Medida
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porUnidadChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={40} />
                <Tooltip formatter={(value) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €`} />
                <Bar dataKey="venta" fill="#3b82f6" name="Venta/ud" radius={[0, 4, 4, 0]} />
                <Bar dataKey="coste" fill="#f59e0b" name="Coste/ud" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 + Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Top 10 Partidas Más Caras
          </h3>
          <p className="text-xs text-slate-400 mb-3">Por precio de venta unitario (no indica rentabilidad)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Bar}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value, name) => [`${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, name]} />
                <Bar dataKey="venta" fill="#3b82f6" name="Venta" radius={[4, 4, 0, 0]} />
                <Bar dataKey="coste" fill="#10b981" name="Coste" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Top 10 Partidas Más Rentables
          </h3>
          <p className="text-xs text-slate-400 mb-3">Por beneficio unitario (venta - coste)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.top10Rentables} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}€`} />
                <YAxis type="category" dataKey="code" width={70} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => `${value.toFixed(2)} €`}
                />
                <Bar dataKey="rentabilidad" name="Rentabilidad" radius={[0, 4, 4, 0]}>
                  {metrics.top10Rentables.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.rentabilidad >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            <span className="inline-block w-3 h-3 rounded bg-green-500 mr-1" /> Rentable
            <span className="inline-block w-3 h-3 rounded bg-red-500 ml-3 mr-1" /> Negativa
          </p>
        </div>
      </div>

      {/* Distribución + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Distribución de Rentabilidad
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.distributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(value) => `${value} partidas`} />
                <Bar dataKey="count" name="Partidas" radius={[6, 6, 0, 0]}>
                  {metrics.distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {metrics.distributionData.map((d, i) => (
              <div key={i}>
                <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: d.color }} />
                <p className="font-semibold text-slate-700">{d.count}</p>
                <p className="text-slate-400">{d.name}</p>
              </div>
            ))}
          </div>
          {metrics.distributionData.length > 0 && (
            <div className="mt-3 h-3 rounded-full overflow-hidden flex bg-slate-100">
              {metrics.distributionData.map((d, i) => (
                <div
                  key={i}
                  className="h-full transition-all"
                  style={{
                    width: `${(d.count / metrics.totalPartidas) * 100}%`,
                    backgroundColor: d.color,
                  }}
                  title={`${d.name}: ${d.count} (${((d.count / metrics.totalPartidas) * 100).toFixed(1)}%)`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Alertas de Rentabilidad Negativa
          </h3>
          <div className="space-y-2">
            {metrics.top10MenosRentables.map((p, i) => (
              <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100/60 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-mono text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded whitespace-nowrap">{p.code}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{p.desc || '–'}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <p className="text-sm font-bold text-red-600">{p.rentabilidad.toFixed(2)} €</p>
                    <p className="text-xs text-slate-400">{p.venta.toFixed(2)} € venta</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ╰──────────────────────────────────────────╯ */}

      {/* ╭──────────────── COST STRUCTURE ───────────╮ */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-indigo-500" />
          Análisis de Estructura de Costes
        </h3>
        <p className="text-xs text-slate-400 mb-4">Compara la distribución de costes de esta obra con la media de la empresa</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Obra Actual */}
          <div>
            <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Estructura de esta Obra</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Material', value: metrics.currentStructure.material },
                      { name: 'Mano Obra', value: metrics.currentStructure.manoObra },
                      { name: 'Contrata', value: metrics.currentStructure.contrata },
                      { name: 'Otros', value: metrics.currentStructure.otros },
                    ].filter(d => d.value > 0.5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Media Empresa */}
          <div>
            <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Media de la Empresa</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Material', value: metrics.globalStructure.material },
                      { name: 'Mano Obra', value: metrics.globalStructure.manoObra },
                      { name: 'Contrata', value: metrics.globalStructure.contrata },
                      { name: 'Otros', value: metrics.globalStructure.otros },
                    ].filter(d => d.value > 0.5)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Alertas de Desviación */}
        <div className="space-y-2">
          {[
            { label: 'Material', current: metrics.currentStructure.material, global: metrics.globalStructure.global, color: '#3b82f6' },
            { label: 'Mano Obra', current: metrics.currentStructure.manoObra, global: metrics.globalStructure.manoObra, color: '#10b981' },
            { label: 'Contrata', current: metrics.currentStructure.contrata, global: metrics.globalStructure.contrata, color: '#f59e0b' },
            { label: 'Otros', current: metrics.currentStructure.otros, global: metrics.globalStructure.otros, color: '#8b5cf6' },
          ].map((item, i) => {
            const diff = item.current - item.global;
            const isSignificant = Math.abs(diff) > 5;
            const isPositive = diff < 0; // Para coste, menos es mejor
            return (
              <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${
                isSignificant
                  ? isPositive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-500">Obra: <strong className="text-slate-700">{item.current.toFixed(1)}%</strong></span>
                  <span className="text-slate-400">vs Media: <strong className="text-slate-600">{item.global.toFixed(1)}%</strong></span>
                  {isSignificant && (
                    <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '↓' : '↑'} {Math.abs(diff).toFixed(1)}% {isPositive ? 'ok' : 'alerta'}
                    </span>
                  )}
                  {!isSignificant && <span className="text-slate-400 text-xs">–</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* ╰──────────────────────────────────────────╯ */}
    </div>
  );
};
// ╰──────────────────────────────────────────╯

// ╭──────────────── COMPARISON VIEW ────────╮

const ComparisonView = ({ obrasData }) => {
  const comparisonData = obrasData.map((item, i) => ({
    obra: item.obraName,
    presupuesto: item.metrics.totalVenta,
    coste: item.metrics.totalCoste,
    ahorro: item.metrics.ahorro,
    ahorroPct: item.metrics.ahorroPct,
    rentabilidad: item.metrics.totalRentabilidad,
    horas: item.metrics.totalHoras,
    rentPorHora: item.metrics.rentabilidadPorHora,
    partidasNegativas: item.metrics.partidasNegativas,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <ArrowRight className="w-6 h-6" />
          <h2 className="text-2xl font-bold">Comparativa de Obras</h2>
        </div>
        <p className="text-purple-100 text-sm">{obrasData.length} obras comparadas</p>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Obra</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Presupuesto</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Coste</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Beneficio</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Beneficio %</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Rent. Total</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">€/h</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Part. Neg.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.obra}</td>
                  <td className="px-4 py-3 text-right font-medium text-blue-700">{row.presupuesto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.coste.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.ahorro > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.ahorro.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.ahorroPct > 10 ? 'bg-green-100 text-green-700' : row.ahorroPct > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {row.ahorroPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${row.rentabilidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.rentabilidad.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="px-4 py-3 text-right text-purple-600 font-medium">{row.rentPorHora.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.partidasNegativas === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {row.partidasNegativas}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            Presupuesto vs Coste
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="obra" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`} />
                <Bar dataKey="presupuesto" fill="#3b82f6" name="Presupuesto" radius={[4, 4, 0, 0]} />
                <Bar dataKey="coste" fill="#10b981" name="Coste" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Beneficio % por Obra
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="obra" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Bar dataKey="ahorroPct" name="Beneficio %" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.ahorroPct > 10 ? '#10b981' : entry.ahorroPct > 0 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Radar Comparison */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <RadarChart className="w-4 h-4 text-cyan-500" />
          Comparativa Radar
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={[
              { subject: 'Beneficio %', ...comparisonData.reduce((acc, d, i) => { acc[`obra${i}`] = Math.min(100, d.ahorroPct); return acc; }, {}) },
              { subject: 'Rent. Total', ...comparisonData.reduce((acc, d, i) => { acc[`obra${i}`] = Math.min(100, Math.max(0, d.rentabilidad / 100)); return acc; }, {}) },
              { subject: '€/h', ...comparisonData.reduce((acc, d, i) => { acc[`obra${i}`] = Math.min(100, Math.max(0, d.rentPorHora)); return acc; }, {}) },
              { subject: 'Partidas', ...comparisonData.reduce((acc, d, i) => { acc[`obra${i}`] = Math.min(100, d.partidasNegativas === 0 ? 100 : 100 - d.partidasNegativas * 5); return acc; }, {}) },
            ]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              {comparisonData.map((d, i) => (
                <Radar
                  key={i}
                  name={d.obra}
                  dataKey={`obra${i}`}
                  stroke={d.color}
                  fill={d.color}
                  fillOpacity={0.2}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
// ╰──────────────────────────────────────────╯

// ╭──────────────── MAIN COMPONENT ─────────╮

const DashboardObra = () => {
  const [mode, setMode] = useState('filter'); // 'filter' | 'compare'
  const [allPartidas, setAllPartidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter mode state
  const [selectedObra, setSelectedObra] = useState('');

  // Compare mode state
  const [selectedObras, setSelectedObras] = useState([]);
  const [compareResults, setCompareResults] = useState([]);

  // Fetch data
  React.useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await fetchAllPartidas();
        setAllPartidas(data || []);
      } catch (err) {
        console.error('Error fetching partidas:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // Compute obra list
  const obrasList = useMemo(() => {
    const obraMap = {};
    allPartidas.forEach(p => {
      const o = p.obra || 'Sin obra';
      if (!obraMap[o]) obraMap[o] = { obra: o, count: 0 };
      obraMap[o].count++;
    });
    return Object.values(obraMap).sort((a, b) => b.count - a.count);
  }, [allPartidas]);

  // Filter mode: compute metrics for selected obra
  const filteredMetrics = useMemo(() => {
    if (!selectedObra) return null;
    const partidas = allPartidas.filter(p => p.obra === selectedObra);
    return calcMetrics(partidas);
  }, [selectedObra, allPartidas]);

  // Compare mode: compute metrics for selected obras
  const handleCompare = () => {
    if (selectedObras.length < 2) return;
    const results = selectedObras.map(obraName => {
      const partidas = allPartidas.filter(p => p.obra === obraName);
      return { obraName, metrics: calcMetrics(partidas) };
    }).filter(r => r.metrics);
    setCompareResults(results);
  };

  const toggleObra = (obraName) => {
    setSelectedObras(prev =>
      prev.includes(obraName)
        ? prev.filter(o => o !== obraName)
        : [...prev, obraName]
    );
  };

  // Render
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-blue-500" />
          Dashboard de Obras
        </h1>
        <p className="text-sm text-slate-500 mt-1">{allPartidas.length} partidas cargadas en total</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setMode('filter'); setSelectedObras([]); setCompareResults([]); }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border ${
            mode === 'filter'
              ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-2" />
          Filtrar por Obra
        </button>
        <button
          onClick={() => { setMode('compare'); setSelectedObra(''); }}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border ${
            mode === 'compare'
              ? 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/20'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ArrowRight className="w-4 h-4 inline mr-2" />
          Comparar Obras
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Cargando datos...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-red-50 border border-red-200 rounded-xl p-8 max-w-md">
            <p className="text-red-600 font-semibold mb-2">Error de conexión</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Filter Mode */}
      {!loading && !error && mode === 'filter' && (
        <div className="flex-1 overflow-y-auto">
          {/* Selector */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              <Building2 className="w-3.5 h-3.5 inline mr-1" /> Selecciona una obra
            </label>
            <select
              value={selectedObra}
              onChange={e => setSelectedObra(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-sm"
            >
              <option value="">-- Selecciona una obra --</option>
              {obrasList.map(o => (
                <option key={o.obra} value={o.obra}>
                  {o.obra} ({o.count} partidas)
                </option>
              ))}
            </select>
          </div>

          {/* Dashboard */}
          <AnimatePresence mode="wait">
            {filteredMetrics ? (
              <motion.div
                key={selectedObra}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <SingleWorkDashboard metrics={filteredMetrics} obraName={selectedObra} />
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="text-center">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium">Selecciona una obra para ver el dashboard</p>
                  <p className="text-sm text-slate-400 mt-1">{obrasList.length} obras disponibles</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Compare Mode */}
      {!loading && !error && mode === 'compare' && (
        <div className="flex-1 overflow-y-auto">
          {/* Selector */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              <ArrowRight className="w-3.5 h-3.5 inline mr-1" /> Selecciona 2+ obras para comparar
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl p-3">
              {obrasList.map(o => (
                <button
                  key={o.obra}
                  onClick={() => toggleObra(o.obra)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                    selectedObras.includes(o.obra)
                      ? 'bg-purple-500 text-white border-purple-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate block">{o.obra}</span>
                  <span className="text-[10px] opacity-70">{o.count} partidas</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-slate-500">
                {selectedObras.length} obra{selectedObras.length !== 1 ? 's' : ''} seleccionada{selectedObras.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={handleCompare}
                disabled={selectedObras.length < 2}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 shadow-lg shadow-purple-500/20"
              >
                Comparar ({selectedObras.length})
              </button>
            </div>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {compareResults.length >= 2 ? (
              <motion.div
                key={compareResults.map(r => r.obraName).join('-')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ComparisonView obrasData={compareResults} />
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="text-center">
                  <ArrowRight className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500 font-medium">Selecciona al menos 2 obras y pulsa "Comparar"</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default DashboardObra;

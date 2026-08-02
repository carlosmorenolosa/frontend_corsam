// src/ChatChart.jsx
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// Intentar convertir string a número
function toNumber(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^\d.\-]/g, ''));
    if (!isNaN(n)) return n;
  }
  return null;
}

function detectChartType(rows) {
  if (!rows || rows.length < 2) return null;

  const cols = Object.keys(rows[0]);
  if (cols.length === 0) return null;

  // Clasificar columnas
  const numericCols = [];
  const stringCols = [];
  for (const c of cols) {
    const sample = rows.slice(0, 10).map(r => r[c]);
    const numericCount = sample.filter(v => toNumber(v) !== null).length;
    if (numericCount >= sample.length * 0.7) {
      numericCols.push(c);
    } else {
      stringCols.push(c);
    }
  }

  // 1 string + 1+ numeric → gráfico
  if (stringCols.length >= 1 && numericCols.length >= 1) {
    const labelCol = stringCols[0];
    const valueCol = numericCols[0];
    const uniqueValues = new Set(rows.map(r => r[labelCol])).size;

    // Preparar datos numéricos
    const chartData = rows.map(r => ({
      name: String(r[labelCol] || '').slice(0, 30),
      value: toNumber(r[valueCol]) || 0,
    }));

    if (uniqueValues <= 8 && rows.length <= 12) {
      return { type: 'pie', data: chartData };
    }
    return { type: 'bar', data: chartData };
  }

  // 2+ numeric columns → barras comparativas
  if (numericCols.length >= 2 && stringCols.length >= 1) {
    const labelCol = stringCols[0];
    const chartData = rows.slice(0, 15).map(r => ({
      name: String(r[labelCol] || '').slice(0, 25),
      [numericCols[0]]: toNumber(r[numericCols[0]]) || 0,
      [numericCols[1]]: toNumber(r[numericCols[1]]) || 0,
    }));
    return { type: 'bar-multi', data: chartData, keys: numericCols.slice(0, 2) };
  }

  return null;
}

function ChatChart({ data }) {
  const chart = detectChartType(data);
  if (!chart) return null;

  if (chart.type === 'pie') {
    return (
      <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chart.data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {chart.data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('es-ES') : v} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.type === 'bar' || chart.type === 'bar-multi') {
    const height = Math.max(250, chart.data.length * 30);
    return (
      <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chart.data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('es-ES') : v} />
            {chart.type === 'bar-multi' ? (
              chart.keys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i]} radius={[0, 4, 4, 0]} />
              ))
            ) : (
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}

export default ChatChart;

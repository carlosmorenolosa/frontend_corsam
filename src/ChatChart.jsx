// src/ChatChart.jsx
// Componente que auto-detecta el mejor gráfico para los datos del chatbot
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// Detectar qué tipo de gráfico es mejor para los datos
function detectChartType(rows) {
  if (!rows || rows.length < 2) return null;

  const cols = Object.keys(rows[0]);
  const numericCols = cols.filter(c => typeof rows[0][c] === 'number');
  const stringCols = cols.filter(c => typeof rows[0][c] === 'string');

  // 1 columna numérica + 1 string → barras o quesito
  if (stringCols.length >= 1 && numericCols.length === 1) {
    const labelCol = stringCols[0];
    const valueCol = numericCols[0];
    const uniqueValues = new Set(rows.map(r => r[labelCol])).size;

    // Pocos valores categóricos → quesito
    if (uniqueValues <= 8 && rows.length <= 10) {
      return { type: 'pie', labelCol, valueCol };
    }
    // Muchos valores → barras
    return { type: 'bar', labelCol, valueCol };
  }

  // 2 numéricas → línea (si una parece secuencial) o scatter
  if (numericCols.length >= 2) {
    const [col1, col2] = numericCols;
    // Si hay un string para labels, usarlo
    const labelCol = stringCols[0] || null;
    return { type: 'bar', labelCol, valueCol: numericCols[0], valueCol2: numericCols[1] };
  }

  return null;
}

function ChatChart({ data }) {
  if (!data || data.length < 2) return null;

  const chartConfig = detectChartType(data);
  if (!chartConfig) return null;

  const { type, labelCol, valueCol } = chartConfig;

  if (type === 'pie') {
    return (
      <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey={valueCol}
              nameKey={labelCol}
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={true}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('es-ES') : v} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4">
        <ResponsiveContainer width="100%" height={Math.max(250, data.length * 28)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              dataKey={labelCol}
              type="category"
              width={150}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => typeof v === 'string' && v.length > 20 ? v.slice(0, 20) + '…' : v}
            />
            <Tooltip
              formatter={(v) => typeof v === 'number' ? v.toLocaleString('es-ES') : v}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey={valueCol} fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}

export default ChatChart;

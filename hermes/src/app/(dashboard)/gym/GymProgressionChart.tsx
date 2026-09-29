'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface DatoGrafica {
  fecha: string
  peso?: number | null
  series: number
  reps?: string | null
}

interface GymProgressionChartProps {
  data: DatoGrafica[]
}

export default function GymProgressionChart({ data }: GymProgressionChartProps) {
  if (data.length < 2) {
    return (
      <div className="empty-state py-12 flex flex-col items-center justify-center text-center">
        <TrendingUp className="w-8 h-8 text-neutral-600 mb-2" />
        <p className="text-sm text-neutral-400">
          Registra al menos 2 sesiones de este ejercicio para ver la gráfica de progreso
        </p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
          labelStyle={{ color: 'var(--text-primary)' }}
          formatter={(v: any) => [`${v} kg`, 'Peso']}
        />
        <Line
          type="monotone"
          dataKey="peso"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ fill: '#10b981', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

'use client';
import { useI18n } from '@/lib/i18n/react';
import { BarChart, Bar, XAxis, YAxis, LabelList, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/money';
export type MonthDatum = { month: string; incoming: number; outgoing: number };
export default function MonthlyChart({ data }: { data: MonthDatum[] }) {
  const { t } = useI18n();
  const multipleYears = new Set(data.map((month) => month.month.slice(0, 4))).size > 1;
  const rows = data.flatMap((month) => {
    const date = new Date(`${month.month}-01T00:00:00Z`);
    const label = date.toLocaleDateString('en-GH', {
      month: 'short',
      ...(multipleYears ? { year: '2-digit' as const } : {}),
      timeZone: 'UTC',
    });
    return [
      { label: t('{value1} · Money in', { value1: label }), amount: month.incoming },
      { label: t('{value1} · Money out', { value1: label }), amount: month.outgoing },
    ];
  });
  return (
    <div className="monthly-chart" aria-hidden="true">
      <ResponsiveContainer width="100%" height={Math.max(104, data.length * 80)}>
        <BarChart
          accessibilityLayer={false}
          data={rows}
          layout="vertical"
          barSize={4}
          margin={{ top: 8, right: 96, left: 0, bottom: 8 }}
        >
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis
            type="category"
            dataKey="label"
            width={multipleYears ? 128 : 112}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 13, fill: '#141414', fontWeight: 400 }}
            interval={0}
          />
          <Bar dataKey="amount" fill="#A87B00" isAnimationActive={false}>
            <LabelList
              dataKey="amount"
              position="right"
              offset={8}
              formatter={(value) => formatMoney(Number(value))}
              fill="#141414"
              fontSize={13}
              fontWeight={400}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

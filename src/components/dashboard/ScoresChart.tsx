import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ScoresChartProps {
  data: { name: string; value: number }[];
}

const getBarColor = (value: number) => {
  if (value === 100) return 'hsl(280, 85%, 55%)';
  if (value >= 80) return 'hsl(142, 70%, 45%)';
  if (value >= 60) return 'hsl(45, 100%, 50%)';
  return 'hsl(0, 72%, 51%)';
};

export function ScoresChart({ data }: ScoresChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 20%, 20%)" />
        <XAxis type="number" domain={[0, 100]} stroke="hsl(260, 10%, 60%)" fontSize={12} />
        <YAxis dataKey="name" type="category" stroke="hsl(260, 10%, 60%)" fontSize={12} width={90} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(260, 20%, 12%)', 
            border: '1px solid hsl(260, 20%, 25%)',
            borderRadius: '8px',
            color: 'white'
          }}
          formatter={(value: number) => [`${value}`, 'Nota']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

import { memo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const sampleData = [
  { name: "00:00", value: 22 },
  { name: "04:00", value: 36 },
  { name: "08:00", value: 31 },
  { name: "12:00", value: 58 },
  { name: "16:00", value: 44 },
  { name: "20:00", value: 67 },
];

function LinePreviewChart({
  data = sampleData,
  dataKey = "value",
  stroke = "#67e8f9",
  labelKey = "name",
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.14)" vertical={false} />
          <XAxis dataKey={labelKey} stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "#08111f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={3}
            dot={{ r: 4, fill: stroke }}
            activeDot={{ r: 6 }}
          />
          <Legend wrapperStyle={{ color: "var(--text-muted)" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(LinePreviewChart);

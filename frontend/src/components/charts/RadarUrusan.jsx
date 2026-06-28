import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function RadarUrusan({
  data,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        Tidak ada data radar
      </div>
    );
  }

  return (
    <div className="w-full min-h-[500px]">
      <ResponsiveContainer
        width="100%"
        height={500}
      >
        <RadarChart
          outerRadius={160}
          data={data}
        >
          <PolarGrid />

          <PolarAngleAxis dataKey="urusan" />

          <PolarRadiusAxis />

          <Radar
            name="Kematangan"
            dataKey="kematangan"
            stroke="#113d64"
            fill="#113d64"
            fillOpacity={0.5}
          />

          <Radar
            name="Jumlah"
            dataKey="jumlah"
            stroke="#1a7a6e"
            fill="#1a7a6e"
            fillOpacity={0.3}
          />

          <Tooltip />

          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from "recharts";

export default function SankeyInovasi({
  data,
}) {
  if (
    !data ||
    !data.nodes ||
    !data.links
  ) {
    return (
      <div className="text-center py-10 text-gray-400">
        Tidak ada data sankey
      </div>
    );
  }

  return (
    <div className="w-full min-h-[500px]">
      <ResponsiveContainer
        width="100%"
        height={500}
      >
        <Sankey
          data={data}
          nodePadding={20}
          margin={{
            top: 20,
            right: 100,
            bottom: 20,
            left: 100,
          }}
        >
          <Tooltip />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
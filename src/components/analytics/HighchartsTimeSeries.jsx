import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { useMemo } from "react";
import { SkeletonBlock } from "../common/Skeleton";

function shortLabel(period) {
  if (!period) return "";
  const s = String(period);
  // "YYYY-MM-DD HH:00" -> "HH:00"
  if (s.includes(" ")) return s.split(" ")[1] || s;
  // "YYYY-MM-DD" -> "MM-DD"
  if (s.length === 10 && s.includes("-")) return s.slice(5);
  return s;
}

export default function HighchartsTimeSeries({ data, loading = false, height = 280 }) {
  const opts = useMemo(() => {
    const points = data?.data || [];
    const byFacility = Array.isArray(data?.by_facility) ? data.by_facility : null;
    const multi = byFacility && byFacility.length > 1;

    const categories = points.map((p) => shortLabel(p.period));

    const palette = ["#2563eb", "#06b6d4", "#22c55e", "#a32638"];
    const markerSymbols = ["circle", "square", "diamond", "triangle"];

    const series = multi
      ? byFacility.map((s, i) => ({
          type: "spline",
          name: s.label,
          color: palette[i % palette.length],
          lineWidth: 2,
          marker: {
            enabled: true,
            radius: 4,
            symbol: markerSymbols[i % markerSymbols.length],
            lineWidth: 1,
            lineColor: "rgba(255,255,255,0.85)"
          },
          data: (s.data || []).map((p) => Number(p.entries ?? 0))
        }))
      : [
          {
            type: "spline",
            name: "Entries",
            color: "#22c55e",
            lineWidth: 2,
            marker: {
              enabled: true,
              radius: 4,
              symbol: "circle",
              lineWidth: 1,
              lineColor: "rgba(255,255,255,0.85)"
            },
            data: points.map((p) => Number(p.entries ?? 0))
          },
          {
            type: "spline",
            name: "Exits",
            color: "#f97316",
            lineWidth: 2,
            marker: {
              enabled: true,
              radius: 4,
              symbol: "diamond",
              lineWidth: 1,
              lineColor: "rgba(255,255,255,0.85)"
            },
            data: points.map((p) => Number(p.exits ?? 0))
          }
        ];

    return {
      chart: {
        type: "spline",
        height,
        backgroundColor: "transparent",
        spacing: [8, 8, 8, 8]
      },
      title: { text: null },
      subtitle: { text: null },
      credits: { enabled: false },
      legend: {
        align: "center",
        verticalAlign: "bottom",
        itemStyle: { fontWeight: "600", color: "#5a6570" }
      },
      xAxis: {
        categories,
        crosshair: true,
        tickLength: 0,
        lineColor: "rgba(148,163,184,0.35)",
        labels: { style: { color: "#64748b", fontSize: "11px" } }
      },
      yAxis: {
        title: { text: null },
        gridLineColor: "rgba(148,163,184,0.18)",
        labels: { style: { color: "#64748b", fontSize: "11px" } }
      },
      tooltip: {
        shared: true,
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        borderColor: "rgba(255,255,255,0.12)",
        style: { color: "#e2e8f0" }
      },
      plotOptions: {
        spline: {
          states: { hover: { lineWidthPlus: 0 } }
        },
        series: {
          animation: { duration: 350 },
          states: { inactive: { opacity: 0.25 } }
        }
      },
      series
    };
  }, [data, height]);

  if (loading) {
    return <SkeletonBlock width="100%" height={height} radius={12} aria-label="Loading trend chart" />;
  }

  if (!data?.data?.length) {
    return <p className="insight-panel__empty">No data available for the selected period.</p>;
  }

  return <HighchartsReact highcharts={Highcharts} options={opts} />;
}


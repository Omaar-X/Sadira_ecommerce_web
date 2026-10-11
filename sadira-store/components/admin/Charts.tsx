"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { DailyPoint } from "@/types/admin";

type Kind = "line" | "columns";
const H = 250, PAD = { l: 52, r: 18, t: 16, b: 32 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}K`.replace(".0K", "K") : String(n));

function niceMax(max: number) {
  if (max <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(max)); const base = max / pow;
  return (base <= 1 ? 1 : base <= 2 ? 2 : base <= 4 ? 4 : base <= 5 ? 5 : 10) * pow;
}

/** Single-series daily chart (line+area or columns) with crosshair tooltip and a table view. */
export function DailyChart({ data, field, kind, label, money = false, color }: { data: DailyPoint[]; field: "orders" | "revenue"; kind: Kind; label: string; money?: boolean; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [W, setW] = useState(560);
  const plot = useRef<HTMLDivElement>(null);
  useEffect(() => { const node = plot.current; if (!node) return; const read = () => setW(Math.max(280, Math.round(node.clientWidth))); read(); const observer = new ResizeObserver(read); observer.observe(node); return () => observer.disconnect(); }, []);
  const fmt = (n: number) => (money ? `৳${n.toLocaleString("en-BD")}` : n.toLocaleString("en-BD"));
  const values = data.map(d => d[field]);
  const peak = Math.max(...values, 0);
  const top = money ? niceMax(peak) : Math.max(4, Math.ceil(peak / 4) * 4);
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const step = iw / data.length;
  const x = (i: number) => PAD.l + step * i + step / 2;
  const y = (v: number) => PAD.t + ih - (v / top) * ih;
  const ticks = [0, 1, 2, 3, 4].map(i => (top / 4) * i);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[field]).toFixed(1)}`).join(" ");
  const area = `${path} L${x(data.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const barW = Math.min(24, step * 0.6);
  const total = values.reduce((a, b) => a + b, 0);
  const empty = total === 0;
  function move(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * iw;
    setHover(Math.max(0, Math.min(data.length - 1, Math.floor(px / step))));
  }
  const tipLeft = hover === null ? 0 : (x(hover) / W) * 100;
  return <figure className="admin-chart" style={{ ["--series" as string]: color }}>
    <div className="admin-chart-plot" ref={plot}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}, last ${data.length} days. Total ${fmt(total)}.`}>
        {ticks.map(t => <g key={t}><line className="admin-chart-grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} /><text className="admin-chart-axis" x={PAD.l - 10} y={y(t) + 4} textAnchor="end">{compact(t)}</text></g>)}
        {data.map((d, i) => i % (W < 440 ? 4 : 2) === (data.length - 1) % (W < 440 ? 4 : 2) && <text key={d.date} className="admin-chart-axis" x={x(i)} y={H - 10} textAnchor="middle">{short(d.date)}</text>)}
        {kind === "line" ? <>
          <path className="admin-chart-area" d={area} />
          <path className="admin-chart-line" d={path} />
          <circle className="admin-chart-dot" cx={x(data.length - 1)} cy={y(values[data.length - 1])} r="5" />
        </> : data.map((d, i) => { const h = Math.max(4, y(0) - y(d[field])); return d[field] > 0 && <path key={d.date} className="admin-chart-bar" data-active={hover === i || undefined} d={`M${x(i) - barW / 2},${y(0)} v${-(h - 4)} a4,4 0 0 1 4,-4 h${barW - 8} a4,4 0 0 1 4,4 v${h - 4} z`} />; })}
        {hover !== null && <g pointerEvents="none">{kind === "line" && <><line className="admin-chart-cross" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} /><circle className="admin-chart-dot" cx={x(hover)} cy={y(values[hover])} r="5" /></>}</g>}
        <rect x={PAD.l} y={PAD.t} width={iw} height={ih} fill="transparent" onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)} />
      </svg>
      {empty && <p className="admin-chart-empty">No orders in this period yet.</p>}
      {hover !== null && <div className="admin-chart-tip" style={{ left: `${Math.min(Math.max(tipLeft, 14), 86)}%` }} role="status"><span>{short(data[hover].date)}</span><strong>{fmt(values[hover])}</strong><span>{label}</span></div>}
    </div>
    <details className="admin-chart-table"><summary>View as table</summary>
      <table className="admin-table"><thead><tr><th scope="col">Date</th><th scope="col">Orders</th><th scope="col">Revenue</th></tr></thead><tbody>{data.map(d => <tr key={d.date}><td>{d.date}</td><td>{d.orders}</td><td>৳{d.revenue.toLocaleString("en-BD")}</td></tr>)}</tbody></table>
    </details>
  </figure>;
}

/** Horizontal bar list — one hue, identity carried by the row label, value at the bar tip. */
export function BarList({ items, empty = "Nothing to show yet." }: { items: { label: string; value: number; note?: string }[]; empty?: string }) {
  const max = Math.max(...items.map(i => i.value), 0);
  if (!items.length || max === 0) return <p className="admin-empty">{empty}</p>;
  return <ul className="admin-barlist">{items.map(item => <li key={item.label}>
    <div className="admin-barlist-head"><span>{item.label}</span><strong>{item.value}{item.note && <em>{item.note}</em>}</strong></div>
    <div className="admin-barlist-track" role="presentation"><div className="admin-barlist-fill" style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }} /></div>
  </li>)}</ul>;
}

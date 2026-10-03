"use client";

import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/land-110m.json";
import { km } from "@/lib/travel";
import { COLORS } from "@/lib/travelColors";

// A globe the reader can rotate: every flight as a great-circle line, a glow at each place he slept (area proportional
// to nights) and labels for his properties and the places he slept abroad. It turns slowly until the reader drags it.

const land = feature(world, world.objects.land);
const graticule = geoGraticule10();
const sphere = { type: "Sphere" };
const INK = "#0b0c0c";
const SECONDARY = "#505a5f";
const OWNED = new Set(["washington", "maralago", "bedminster", "property"]);
const CONTROL = "flex h-[30px] w-[30px] items-center justify-center text-[18px] leading-none text-[#0b0c0c] hover:bg-[#f3f2f1] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#ffdd00]";
const NOW_RED = "#d4351c";
const RECENT_BLUE = "#1d70b8";
const RECENT_DAYS = 7;
const ageDays = (date, to) => (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 864e5;

const legStyle = (a, b) =>
  a.category === "maralago" || b.category === "maralago"
    ? [COLORS.maralago.cell, 0.55, 1.6]
    : a.category === "bedminster" || b.category === "bedminster"
      ? [COLORS.bedminster.cell, 0.6, 1.6]
      : [INK, 0.22, 1.1];

// `now` adds a pulsing marker at the current location and centres the globe there. Flights fade with age and the
// last week's are drawn in blue. `compact` is the wide, shorter version on the Schedule page: no spin, starts zoomed.
export function TravelGlobe({ places, flights, to, now = null, compact = false, startZoom = 1 }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const controls = useRef(null);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el.getContext("2d");
    const font = getComputedStyle(document.body).fontFamily;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = now ? [-now.lon, -Math.max(-60, Math.min(60, now.lat)), 0] : [77, -28, 0]; // otherwise the eastern US
    const rotation = [...start];
    const projection = geoOrthographic().clipAngle(90).precision(0.3);
    const path = geoPath(projection, ctx);
    const slept = places.filter((p) => p.nights > 0).sort((a, b) => b.nights - a.nights);
    const seen = places.filter((p) => p.nights > 0 || p.visits > 0);
    const legs = flights
      .map((f) => {
        const a = places[f.from], b = places[f.to];
        const age = to && f.date ? ageDays(f.date, to) : 0;
        const recent = to && age < RECENT_DAYS;
        const [color, opacity, width] = recent ? [RECENT_BLUE, 0.95, 2.4] : legStyle(a, b);
        // Older flights fade towards a third of their strength over the year.
        const fade = recent ? 1 : 0.35 + 0.65 * Math.max(0, 1 - age / 365);
        return { a, b, color, opacity: opacity * fade, width, recent };
      })
      .sort((x, y) => Number(x.recent) - Number(y.recent) || x.opacity - y.opacity);
    // The compact globe covers two weeks, so every place he went gets a label; the full year labels the main ones.
    const labelled = (
      compact
        ? seen
        : [...slept.filter((p) => OWNED.has(p.category)), ...slept.filter((p) => !OWNED.has(p.category) && (p.category === "abroad" || p.nights >= 2))]
    ).filter((p) => !now || km(p, now) > 80); // the Now label names the current place
    let width = 0;
    let height = 0;
    let radius = 0;
    let frame = 0;
    let zoom = startZoom;

    const resize = () => {
      const w = wrap.current.clientWidth;
      width = compact ? w : Math.min(w, 760);
      height = compact ? (w < 640 ? 240 : 320) : width;
      const dpr = window.devicePixelRatio || 1;
      el.width = width * dpr;
      el.height = height * dpr;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(width, height) / 2 - 6;
      projection.translate([width / 2, height / 2]);
      draw();
    };

    const visible = (p) => geoDistance([p.lon, p.lat], [-rotation[0], -rotation[1]]) < Math.PI / 2 - 0.02;

    function draw() {
      projection.rotate(rotation).scale(radius * zoom);
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      path(sphere);
      ctx.fillStyle = "#f8f8f8";
      ctx.fill();
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "#e3e4e5";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.beginPath();
      path(land);
      ctx.fillStyle = "#e1e2e3";
      ctx.fill();

      ctx.globalCompositeOperation = "multiply";
      const k = radius / 300;
      for (const p of slept) {
        if (!visible(p)) continue;
        const [x, y] = projection([p.lon, p.lat]);
        const r = Math.max(4, (24 / Math.sqrt(52)) * Math.sqrt(p.nights) * k) * 1.2;
        const color = COLORS[p.category].glow;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const a = p.category === "washington" ? 0.8 : 1;
        g.addColorStop(0, hexA(color, 0.5 * a));
        g.addColorStop(0.6, hexA(color, 0.36 * a));
        g.addColorStop(0.83, hexA(color, 0.24 * a));
        g.addColorStop(1, hexA(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
      }
      for (const leg of legs) {
        if (leg.recent) continue;
        ctx.beginPath();
        path({ type: "LineString", coordinates: [[leg.a.lon, leg.a.lat], [leg.b.lon, leg.b.lat]] });
        ctx.strokeStyle = hexA(leg.color, leg.opacity);
        ctx.lineWidth = leg.width;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      for (const leg of legs) {
        if (!leg.recent) continue;
        ctx.beginPath();
        path({ type: "LineString", coordinates: [[leg.a.lon, leg.a.lat], [leg.b.lon, leg.b.lat]] });
        ctx.strokeStyle = hexA(leg.color, leg.opacity);
        ctx.lineWidth = leg.width;
        ctx.stroke();
      }
      ctx.fillStyle = INK;
      for (const p of seen) {
        if (!visible(p)) continue;
        const [x, y] = projection([p.lon, p.lat]);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, 2 * Math.PI);
        ctx.fill();
      }
      drawNow();
      drawLabels();
      ctx.beginPath();
      path(sphere);
      ctx.strokeStyle = "#b1b4b6";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // A red dot with a ring that pulses outwards every 1.6 s (static for reduced motion).
    function drawNow() {
      if (!now || !visible(now)) return;
      const [x, y] = projection([now.lon, now.lat]);
      const t = reduceMotion ? 0.35 : (performance.now() % 1600) / 1600;
      ctx.beginPath();
      ctx.arc(x, y, 6 + t * 16, 0, 2 * Math.PI);
      ctx.strokeStyle = hexA(NOW_RED, 0.6 * (1 - t));
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, 2 * Math.PI);
      ctx.fillStyle = NOW_RED;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Greedy placement: right of the dot, then left; a label that would overlap an earlier one is skipped.
    function drawLabels() {
      const boxes = [];
      ctx.lineJoin = "round";
      if (now && visible(now)) {
        const [x, y] = projection([now.lon, now.lat]);
        ctx.font = `700 14px ${font}`;
        const text = `Now: ${now.label}`;
        const w = ctx.measureText(text).width;
        const left = x - w / 2;
        const top = y - 34;
        boxes.push({ x: left - 4, y: top - 9, w: w + 8, h: 18 });
        // The current place keeps its own label below, so it is not drawn twice.
        boxes.push({ x: x - 4, y: y - 8, w: 8, h: 16 });
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(248,248,248,0.95)";
        ctx.lineWidth = 3.5;
        ctx.strokeText(text, left, top);
        ctx.fillStyle = NOW_RED;
        ctx.fillText(text, left, top);
      }
      for (const p of labelled) {
        if (!visible(p)) continue;
        const [x, y] = projection([p.lon, p.lat]);
        const main = OWNED.has(p.category);
        const name = p.label;
        const sub = main && !compact && p.category !== "washington" ? ` ${p.nights} night${p.nights === 1 ? "" : "s"}` : "";
        const nameFont = `${main ? 700 : 600} ${main ? 14 : 12}px ${font}`;
        const subFont = `400 ${main ? 14 : 12}px ${font}`;
        ctx.font = nameFont;
        const wName = ctx.measureText(name).width;
        ctx.font = subFont;
        const wSub = sub ? ctx.measureText(sub).width : 0;
        const w = wName + wSub;
        const h = main ? 16 : 14;
        const options = [x + 7, x - 7 - w];
        const left = options.find((lx) => !boxes.some((o) => lx < o.x + o.w && lx + w > o.x && y - h / 2 < o.y + o.h && y + h / 2 > o.y));
        if (left === undefined) continue;
        boxes.push({ x: left, y: y - h / 2, w, h });
        ctx.textBaseline = "middle";
        ctx.font = nameFont;
        ctx.strokeStyle = "rgba(248,248,248,0.9)";
        ctx.lineWidth = 3;
        ctx.strokeText(name, left, y);
        ctx.fillStyle = INK;
        ctx.fillText(name, left, y);
        if (sub) {
          ctx.font = subFont;
          ctx.strokeText(sub, left + wName, y);
          ctx.fillStyle = SECONDARY;
          ctx.fillText(sub, left + wName, y);
        }
      }
    }

    const tick = () => {
      // The globe holds still; only the Now marker's pulse needs frames.
      if (now && !reduceMotion && visible(now)) {
        draw();
      }
      frame = requestAnimationFrame(tick);
    };

    // The dot nearest the pointer within 12 px, front side of the globe only.
    const hit = (e) => {
      const box = el.getBoundingClientRect();
      const mx = e.clientX - box.left, my = e.clientY - box.top;
      let best = null;
      for (const p of seen) {
        if (!visible(p)) continue;
        const [x, y] = projection([p.lon, p.lat]);
        const d = Math.hypot(x - mx, y - my);
        if (d < 12 && (!best || d < best.d)) best = { p, d, x, y };
      }
      return best;
    };

    let drag = null;
    // Two fingers on a touch screen pinch-zoom the globe instead of rotating it.
    const pointers = new Map();
    let pinch = null;
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        pinch = { d: spread(), z: zoom };
        drag = null;
        return;
      }
      drag = { x: e.clientX, y: e.clientY, r: [...rotation], moved: false };
    };
    const move = (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        setZoom((pinch.z * spread()) / pinch.d);
        return;
      }
      if (!drag) {
        el.style.cursor = hit(e) ? "pointer" : "";
        return;
      }
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) {
        drag.moved = true;
        if (selectedRef.current) setSelected(null);
      }
      if (!drag.moved) return;
      const scale = 180 / (Math.PI * radius * zoom);
      rotation[0] = drag.r[0] + (e.clientX - drag.x) * scale;
      rotation[1] = Math.max(-90, Math.min(90, drag.r[1] - (e.clientY - drag.y) * scale));
      draw();
    };
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag && !drag.moved) {
        const h = hit(e);
        setSelected(h ? { id: h.p.id, x: h.x, y: h.y } : null);
      }
      drag = null;
    };

    // Zoom by ctrl or cmd plus scroll (also a trackpad pinch), buttons or double-click. A plain scroll stays with the
    // page.
    const wheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoom(zoom * Math.exp(-e.deltaY * 0.0025));
    };
    function setZoom(z) {
      zoom = Math.max(1, Math.min(8, z));
      setSelected(null);
      draw();
    }
    const zoomIn = () => setZoom(zoom * 1.6);
    const zoomOut = () => setZoom(zoom / 1.6);
    const reset = () => {
      rotation.splice(0, 3, ...start);
      setZoom(startZoom);
    };
    const [inBtn, outBtn, resetBtn] = controls.current.querySelectorAll("button");
    inBtn.addEventListener("click", zoomIn);
    outBtn.addEventListener("click", zoomOut);
    resetBtn.addEventListener("click", reset);
    el.addEventListener("dblclick", zoomIn);
    el.addEventListener("wheel", wheel, { passive: false });

    const observer = new ResizeObserver(resize);
    observer.observe(wrap.current);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("dblclick", zoomIn);
      el.removeEventListener("wheel", wheel);
      inBtn.removeEventListener("click", zoomIn);
      outBtn.removeEventListener("click", zoomOut);
      resetBtn.removeEventListener("click", reset);
    };
  }, [places, flights, to, now, compact, startZoom]);

  return (
    <div ref={wrap} className="relative flex flex-col items-center">
      {selected && <PlaceCard place={places[selected.id]} x={selected.x} y={selected.y} offset={wrap.current} canvas={canvas.current} onClose={() => setSelected(null)} />}
      <div className="relative">
        <canvas
          ref={canvas}
          role="img"
          aria-label="Globe with the president's flights and the places he slept"
          className="block cursor-grab touch-pan-y active:cursor-grabbing"
        />
        {/* Zoom controls stacked at the top left, where web maps put them. */}
        <div ref={controls} className="absolute left-3 top-3 flex flex-col border border-[#b1b4b6] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
          <button type="button" aria-label="Zoom in" className={CONTROL}>+</button>
          <button type="button" aria-label="Zoom out" className={`${CONTROL} border-t border-[#b1b4b6]`}>−</button>
          <button type="button" aria-label="Reset view" title="Reset view" className={`${CONTROL} border-t border-[#b1b4b6]`}>
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const fmtDate = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const nightsBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;
const MAX_ROWS = 6;

// Where and when: the place, its last stop of the day, and each stay (or each arrival, for places he only passed
// through), most recent first.
function PlaceCard({ place, x, y, offset, canvas, onClose }) {
  const [all, setAll] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const left = (canvas?.offsetLeft ?? 0) + x;
  const top = (canvas?.offsetTop ?? 0) + y;
  const flipX = offset && left > offset.clientWidth / 2;
  const rows = place.nights > 0
    ? [...place.stays].reverse().map(([a, b]) => `${a === b ? fmtDate(a) : `${fmtDate(a)} to ${fmtDate(b)}`} · ${nightsBetween(a, b)} night${nightsBetween(a, b) === 1 ? "" : "s"}`)
    : [...place.arrivals].reverse().map((d) => `Arrived ${fmtDate(d)}`);
  return (
    <div
      role="dialog"
      aria-label={place.label}
      className="absolute z-10 w-[280px] border border-[#b1b4b6] bg-white p-3 text-[14px] leading-[1.45] shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
      style={{ left: flipX ? left - 292 : left + 12, top: Math.max(0, top - 20) }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold text-[#0b0c0c]">{place.label}</div>
          {place.name && place.name !== place.label && <div className="text-[13px] text-[#505a5f]">{place.name}</div>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="px-1 text-[18px] leading-none text-[#505a5f] hover:text-[#0b0c0c]">
          ×
        </button>
      </div>
      <div className="mt-1 font-semibold">
        {place.nights > 0 ? `${place.nights} night${place.nights === 1 ? "" : "s"}` : "No nights"}
        {place.visits > 0 && <span className="font-normal text-[#505a5f]"> · {place.visits} flight{place.visits === 1 ? "" : "s"} in</span>}
      </div>
      <ul className="mt-1 max-h-[240px] overflow-y-auto text-[13px] text-[#26282a]">
        {(all ? rows : rows.slice(0, MAX_ROWS)).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {!all && rows.length > MAX_ROWS && (
        <button type="button" onClick={() => setAll(true)} className="dk-link mt-1 text-[13px]">
          Show {rows.length - MAX_ROWS} more
        </button>
      )}
    </div>
  );
}

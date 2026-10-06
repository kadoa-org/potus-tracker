"use client";

import { geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/land-110m.json";
import { addDays, etClock, km } from "@/lib/travel";
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
// On the trip map the trip already flown is grey and only what comes next is blue, so "Next" never reads as one of
// the past legs.
const FLOWN_GREY = "#505a5f";
// Close enough to show a 50 km hop as a readable arc; the detailed coastline below loads once the map passes DETAIL_ZOOM.
const MAX_TRIP_ZOOM = 60;
const DETAIL_ZOOM = 6;
const ageDays = (date, to) => (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 864e5;

const legStyle = (a, b) =>
  a.category === "maralago" || b.category === "maralago"
    ? [COLORS.maralago.cell, 0.55, 1.6]
    : a.category === "bedminster" || b.category === "bedminster"
      ? [COLORS.bedminster.cell, 0.6, 1.6]
      : [INK, 0.22, 1.1];

// `now` adds a pulsing marker at the current location and centres the globe there. Flights fade with age and the
// last week's are drawn in blue. `compact` is the wide, shorter version on the Schedule page: no spin, starts zoomed.
// `trip`, with `compact`, draws only those legs (his latest trip), each with an arrow, and labels every stop with the
// day he arrived, so the map shows how he got to where he is now rather than a fan of older routes.
// "today", "yesterday", the weekday within the past week, otherwise "Oct 5", all by the date in Washington.
const dayLabel = (d) => {
  const today = etClock().slice(0, 10);
  const day = new Date(`${d}T12:00:00Z`);
  if (d === today) return "today";
  if (d === addDays(today, -1)) return "yesterday";
  if (d > addDays(today, -7)) return day.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return day.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

// `next`, on the trip map, is his next scheduled stop ({ lat, lon, text }): a dashed arc from the Now dot, because it
// is planned and can change, the convention flight trackers use for the rest of a route.
export function TravelGlobe({ places, flights, to, now = null, compact = false, startZoom = 1, trip = null, next = null }) {
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
    const projection = geoOrthographic().clipAngle(90).precision(0.3);
    const path = geoPath(projection, ctx);
    const tripMode = compact && Array.isArray(trip);
    const slept = tripMode ? [] : places.filter((p) => p.nights > 0).sort((a, b) => b.nights - a.nights);
    const arrived = new Map(tripMode ? trip.map((f) => [f.to, f.date]) : []);
    const seen = tripMode ? [...new Set(trip.flatMap((f) => [f.from, f.to]))].map((i) => places[i]) : places.filter((p) => p.nights > 0 || p.visits > 0);
    // The trip map centres on the trip and where he is now, so a stop at either end is not pushed to the edge; the other
    // maps centre on where he is now, or on the eastern US.
    const upcoming = tripMode && now && next ? next : null;
    // Auto-fit, the way web maps fit bounds: the trip map frames what answers "where next" when there is a next stop
    // (the Now dot and that stop), otherwise the latest trip, with padding. Older legs may run off the edge as context.
    const focus = tripMode ? (upcoming ? [now, upcoming] : [...seen, ...(now ? [now] : [])]) : now ? [now] : [];
    const centreLon = focus.length ? focus.reduce((a, p) => a + p.lon, 0) / focus.length : -77;
    const centreLat = focus.length ? focus.reduce((a, p) => a + p.lat, 0) / focus.length : 28;
    const start = [-centreLon, -Math.max(-60, Math.min(60, centreLat)), 0];
    const rotation = [...start];
    const legs = (tripMode ? trip : flights)
      .map((f) => {
        const a = places[f.from], b = places[f.to];
        const age = to && f.date ? ageDays(f.date, to) : 0;
        const recent = tripMode || (to && age < RECENT_DAYS);
        const [color, opacity, width] = tripMode ? [FLOWN_GREY, 0.85, 2] : recent ? [RECENT_BLUE, 0.95, 2.4] : legStyle(a, b);
        // Older flights fade towards a third of their strength over the year.
        const fade = recent ? 1 : 0.35 + 0.65 * Math.max(0, 1 - age / 365);
        return { a, b, color, opacity: opacity * fade, width, recent, arrow: tripMode };
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
    // The 110m outline turns blocky past a state; the 50m one (about 550 KB) is fetched only when the map zooms in.
    let detail = null;
    let detailLoading = false;
    const loadDetail = () => {
      if (detailLoading) return;
      detailLoading = true;
      import("world-atlas/land-50m.json").then((m) => {
        const topo = m.default ?? m;
        detail = feature(topo, topo.objects.land);
        draw();
      });
    };
    let zoomedByReader = false;
    // A phone shows the same area at a lower zoom, or the trip's labels have nowhere to go.
    const baseZoom = () => (compact && width < 640 ? startZoom * 0.62 : startZoom);
    // The zoom that fits every focus point inside the map with room for labels, up to street-free city level.
    const fitZoom = () => {
      if (!tripMode || focus.length < 2) return baseZoom();
      const spread = Math.max(...focus.map((p) => geoDistance([centreLon, centreLat], [p.lon, p.lat])));
      const room = Math.min(width, height) / 2 - (width < 640 ? 70 : 60);
      return Math.max(1, Math.min(MAX_TRIP_ZOOM, room / (radius * Math.sin(Math.max(spread, 1e-4)))));
    };

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
      if (!zoomedByReader) zoom = fitZoom();
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
      if (compact && zoom > DETAIL_ZOOM && !detail) loadDetail();
      ctx.beginPath();
      path(compact && zoom > DETAIL_ZOOM && detail ? detail : land);
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
        if (leg.arrow) {
          drawTripLeg(leg);
          continue;
        }
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
      if (upcoming && !nextIsNear()) {
        drawTripLeg({ a: now, b: upcoming, color: RECENT_BLUE, opacity: 0.85, width: 2, dash: [6, 5] });
        if (visible(upcoming)) {
          const [x, y] = projection([upcoming.lon, upcoming.lat]);
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.strokeStyle = RECENT_BLUE;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      drawNow();
      drawLabels();
      ctx.beginPath();
      path(sphere);
      ctx.strokeStyle = "#b1b4b6";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // A trip leg: the great circle, bent to the right of the direction of travel by a tenth of its length, so the way
    // out and the way back are two arcs. An arrowhead just short of the destination gives the direction.
    function drawTripLeg(leg) {
      if (!visible(leg.a) && !visible(leg.b)) return;
      const along = geoInterpolate([leg.a.lon, leg.a.lat], [leg.b.lon, leg.b.lat]);
      const raw = Array.from({ length: 41 }, (_, i) => projection(along(i / 40)));
      const [x0, y0] = raw[0], [x1, y1] = raw[40];
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      const bend = Math.min(40, len * 0.1);
      const pts = raw.map(([x, y], i) => { const k = Math.sin((Math.PI * i) / 40) * bend; return [x + nx * k, y + ny * k]; });
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = hexA(leg.color, leg.opacity);
      ctx.lineWidth = leg.width;
      ctx.setLineDash(leg.dash ?? []);
      ctx.stroke();
      ctx.setLineDash([]);
      const [ax, ay] = pts[34], [bx, by] = pts[38];
      const angle = Math.atan2(by - ay, bx - ax);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - Math.cos(angle - 0.45) * 10, by - Math.sin(angle - 0.45) * 10);
      ctx.lineTo(bx - Math.cos(angle + 0.45) * 10, by - Math.sin(angle + 0.45) * 10);
      ctx.closePath();
      ctx.fillStyle = hexA(leg.color, leg.opacity);
      ctx.fill();
    }

    // A next stop within a few pixels of the Now dot (a day trip to Baltimore at this zoom) gets no arc, which would
    // be a smudge; its label becomes a second line under the Now label instead.
    function nextIsNear() {
      if (!upcoming || !visible(upcoming) || !visible(now)) return false;
      const [x1, y1] = projection([now.lon, now.lat]);
      const [x2, y2] = projection([upcoming.lon, upcoming.lat]);
      return Math.hypot(x2 - x1, y2 - y1) < 40;
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
      // The zoom buttons sit over the top-left corner; no label goes under them.
      const boxes = [{ x: 0, y: 0, w: 52, h: 112 }];
      const fits = (lx, w) => lx >= 4 && lx + w <= width - 4;
      ctx.lineJoin = "round";
      if (now && visible(now)) {
        const [x, y] = projection([now.lon, now.lat]);
        ctx.font = `700 14px ${font}`;
        const text = `Now: ${now.label}`;
        const w = ctx.measureText(text).width;
        // On the Schedule map the trip's arcs leave the dot sideways, so the label sits beside it, on whichever side fits.
        // Where that does not fit (a phone), it goes centred below the dot, kept inside the map.
        const right = fits(x + 12, w);
        const below = Math.max(4, Math.min(width - 4 - w, x - w / 2));
        // Above instead when the dashed leg to the next stop heads down, so the label does not sit on it.
        const nextBelow = upcoming && !nextIsNear() && visible(upcoming) && projection([upcoming.lon, upcoming.lat])[1] > y;
        const left = tripMode ? (right ? x + 12 : below) : x - w / 2;
        const top = tripMode ? (right ? y + 1 : nextBelow ? y - 26 : y + 26) : y - 34;
        boxes.push({ x: left - 4, y: top - 9, w: w + 8, h: 18 });
        // The current place keeps its own label below, so it is not drawn twice.
        boxes.push({ x: x - 4, y: y - 8, w: 8, h: 16 });
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(248,248,248,0.95)";
        ctx.lineWidth = 3.5;
        ctx.strokeText(text, left, top);
        ctx.fillStyle = NOW_RED;
        ctx.fillText(text, left, top);
        if (nextIsNear()) {
          ctx.font = `700 13px ${font}`;
          const line = `Next: ${upcoming.text}`;
          const lw = ctx.measureText(line).width;
          const lx = Math.max(4, Math.min(width - 4 - lw, left));
          boxes.push({ x: lx - 4, y: top + 9, w: lw + 8, h: 18 });
          ctx.strokeText(line, lx, top + 18);
          ctx.fillStyle = RECENT_BLUE;
          ctx.fillText(line, lx, top + 18);
        }
      }
      if (upcoming && visible(upcoming) && !nextIsNear()) {
        const [x, y] = projection([upcoming.lon, upcoming.lat]);
        ctx.font = `700 13px ${font}`;
        const text = `Next: ${upcoming.text}`;
        const w = ctx.measureText(text).width, h = 16;
        // The dashed leg arrives from the Now dot, so the label prefers the side facing away from it.
        const [nx, ny] = projection([now.lon, now.lat]);
        const sideways = x > nx ? [x + 9, y] : [x - 9 - w, y];
        const upDown = y > ny ? [x - w / 2, y + h + 4] : [x - w / 2, y - h - 4];
        const towards = [[x > nx ? x - 9 - w : x + 9, y], [x - w / 2, y > ny ? y - h - 4 : y + h + 4]];
        const awayFirst = Math.abs(y - ny) > Math.abs(x - nx) ? [upDown, sideways, ...towards] : [sideways, upDown, ...towards];
        const spot = awayFirst.find(([lx, ly]) => fits(lx, w) && !boxes.some((o) => lx < o.x + o.w && lx + w > o.x && ly - h / 2 < o.y + o.h && ly + h / 2 > o.y));
        if (spot) {
          const [lx, ly] = spot;
          boxes.push({ x: lx, y: ly - h / 2, w, h });
          ctx.textBaseline = "middle";
          ctx.strokeStyle = "rgba(248,248,248,0.95)";
          ctx.lineWidth = 3.5;
          ctx.strokeText(text, lx, ly);
          ctx.fillStyle = RECENT_BLUE;
          ctx.fillText(text, lx, ly);
        }
      }
      for (const p of labelled) {
        if (!visible(p)) continue;
        const [x, y] = projection([p.lon, p.lat]);
        const main = OWNED.has(p.category);
        const name = p.label;
        const sub = tripMode
          ? arrived.has(p.id) ? dayLabel(arrived.get(p.id)) : ""
          : main && !compact && p.category !== "washington" ? ` ${p.nights} night${p.nights === 1 ? "" : "s"}` : "";
        const nameFont = `${main ? 700 : 600} ${main ? 14 : 12}px ${font}`;
        const subFont = `400 ${main ? 14 : 12}px ${font}`;
        ctx.font = nameFont;
        const wName = ctx.measureText(name).width;
        ctx.font = subFont;
        const wSub = sub ? ctx.measureText(sub).width : 0;
        // On the trip map the day sits under the name; elsewhere the nights follow it on one line.
        const stack = tripMode && sub;
        const w = stack ? Math.max(wName, wSub) : wName + wSub;
        const h = stack ? 30 : main ? 16 : 14;
        // On the trip map every route runs towards where he is now, so a stop's label goes on the side facing away.
        const away = tripMode && now && visible(now) && x < projection([now.lon, now.lat])[0];
        // Beside the dot first; on the trip map, centred above or below it when neither side has room.
        const sides = away ? [[x - 7 - w, y], [x + 7, y]] : [[x + 7, y], [x - 7 - w, y]];
        const stacked = tripMode ? [[x - w / 2, y - h - 2], [x - w / 2, y + h + 2]] : [];
        const spot = [...sides, ...stacked].find(([lx, ly]) => fits(lx, w) && !boxes.some((o) => lx < o.x + o.w && lx + w > o.x && ly - h / 2 < o.y + o.h && ly + h / 2 > o.y));
        if (!spot) continue;
        const [left, ly] = spot;
        boxes.push({ x: left, y: ly - h / 2, w, h });
        ctx.textBaseline = "middle";
        ctx.font = nameFont;
        ctx.strokeStyle = "rgba(248,248,248,0.9)";
        ctx.lineWidth = 3;
        const nameY = stack ? ly - 7 : ly;
        ctx.strokeText(name, left, nameY);
        ctx.fillStyle = INK;
        ctx.fillText(name, left, nameY);
        if (sub) {
          ctx.font = subFont;
          const [sx, sy] = stack ? [left, ly + 8] : [left + wName, ly];
          ctx.strokeText(sub, sx, sy);
          ctx.fillStyle = SECONDARY;
          ctx.fillText(sub, sx, sy);
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
    function setZoom(z, byReader = true) {
      zoomedByReader = byReader;
      zoom = Math.max(1, Math.min(compact ? MAX_TRIP_ZOOM : 8, z));
      setSelected(null);
      draw();
    }
    const zoomIn = () => setZoom(zoom * 1.6);
    const zoomOut = () => setZoom(zoom / 1.6);
    const reset = () => {
      rotation.splice(0, 3, ...start);
      setZoom(fitZoom(), false);
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
  }, [places, flights, to, now, compact, startZoom, trip, next]);

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

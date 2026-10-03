"use client";

import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { useEffect, useRef } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/land-110m.json";
import { COLORS } from "@/lib/travelColors";

// A globe the reader can rotate: every flight as a great-circle line, a glow at each place he slept (area proportional
// to nights) and labels for his properties and the places he slept abroad. It turns slowly until the reader drags it.

const land = feature(world, world.objects.land);
const graticule = geoGraticule10();
const sphere = { type: "Sphere" };
const INK = "#0b0c0c";
const SECONDARY = "#505a5f";
const OWNED = new Set(["washington", "maralago", "bedminster", "property"]);
const SPIN = 0.06; // degrees per frame
const RESUME_MS = 6000;

const legStyle = (a, b) =>
  a.category === "maralago" || b.category === "maralago"
    ? [COLORS.maralago.cell, 0.55, 1.6]
    : a.category === "bedminster" || b.category === "bedminster"
      ? [COLORS.bedminster.cell, 0.6, 1.6]
      : [INK, 0.22, 1.1];

export function TravelGlobe({ places, flights }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const controls = useRef(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el.getContext("2d");
    const font = getComputedStyle(document.body).fontFamily;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rotation = [77, -28, 0]; // starts over the eastern US
    const projection = geoOrthographic().clipAngle(90).precision(0.3);
    const path = geoPath(projection, ctx);
    const slept = places.filter((p) => p.nights > 0).sort((a, b) => b.nights - a.nights);
    const seen = places.filter((p) => p.nights > 0 || p.visits > 0);
    const legs = flights.map((f) => [places[f.from], places[f.to]]).sort(([a, b], [c, d]) => legStyle(a, b)[1] - legStyle(c, d)[1]);
    const labelled = [
      ...slept.filter((p) => OWNED.has(p.category)),
      ...slept.filter((p) => !OWNED.has(p.category) && (p.category === "abroad" || p.nights >= 2)),
    ];
    let size = 0;
    let radius = 0;
    let frame = 0;
    let lastInteraction = -Infinity;
    let zoom = 1;

    const resize = () => {
      const w = wrap.current.clientWidth;
      size = Math.min(w, 760);
      const dpr = window.devicePixelRatio || 1;
      el.width = size * dpr;
      el.height = size * dpr;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = size / 2 - 6;
      projection.translate([size / 2, size / 2]);
      draw();
    };

    const visible = (p) => geoDistance([p.lon, p.lat], [-rotation[0], -rotation[1]]) < Math.PI / 2 - 0.02;

    function draw() {
      projection.rotate(rotation).scale(radius * zoom);
      ctx.clearRect(0, 0, size, size);
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
      for (const [a, b] of legs) {
        const [color, opacity, width] = legStyle(a, b);
        ctx.beginPath();
        path({ type: "LineString", coordinates: [[a.lon, a.lat], [b.lon, b.lat]] });
        ctx.strokeStyle = hexA(color, opacity);
        ctx.lineWidth = width;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = INK;
      for (const p of seen) {
        if (!visible(p)) continue;
        const [x, y] = projection([p.lon, p.lat]);
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, 2 * Math.PI);
        ctx.fill();
      }
      drawLabels();
      ctx.beginPath();
      path(sphere);
      ctx.strokeStyle = "#b1b4b6";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Greedy placement: right of the dot, then left; a label that would overlap an earlier one is skipped.
    function drawLabels() {
      const boxes = [];
      ctx.lineJoin = "round";
      for (const p of labelled) {
        if (!visible(p)) continue;
        const [x, y] = projection([p.lon, p.lat]);
        const main = OWNED.has(p.category);
        const name = p.label;
        const sub = main && p.category !== "washington" ? ` ${p.nights} night${p.nights === 1 ? "" : "s"}` : "";
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

    const tick = (now) => {
      if (!reduceMotion && zoom === 1 && now - lastInteraction > RESUME_MS) {
        rotation[0] = (rotation[0] + SPIN) % 360;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };

    let drag = null;
    const down = (e) => {
      drag = { x: e.clientX, y: e.clientY, r: [...rotation] };
      el.setPointerCapture(e.pointerId);
      lastInteraction = performance.now();
    };
    const move = (e) => {
      if (!drag) return;
      const scale = 180 / (Math.PI * radius * zoom);
      rotation[0] = drag.r[0] + (e.clientX - drag.x) * scale;
      rotation[1] = Math.max(-90, Math.min(90, drag.r[1] - (e.clientY - drag.y) * scale));
      lastInteraction = performance.now();
      draw();
    };
    const up = () => {
      drag = null;
      lastInteraction = performance.now();
    };

    // Zoom by buttons or double-click; the scroll wheel stays with the page.
    const setZoom = (z) => {
      zoom = Math.max(1, Math.min(8, z));
      lastInteraction = performance.now();
      draw();
    };
    const zoomIn = () => setZoom(zoom * 1.6);
    const zoomOut = () => setZoom(zoom / 1.6);
    const reset = () => {
      rotation.splice(0, 3, 77, -28, 0);
      setZoom(1);
    };
    const [inBtn, outBtn, resetBtn] = controls.current.querySelectorAll("button");
    inBtn.addEventListener("click", zoomIn);
    outBtn.addEventListener("click", zoomOut);
    resetBtn.addEventListener("click", reset);
    el.addEventListener("dblclick", zoomIn);

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
      inBtn.removeEventListener("click", zoomIn);
      outBtn.removeEventListener("click", zoomOut);
      resetBtn.removeEventListener("click", reset);
    };
  }, [places, flights]);

  return (
    <div ref={wrap} className="flex flex-col items-center">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Globe with every flight the president took in the past year and glows where he slept"
        className="cursor-grab touch-pan-y active:cursor-grabbing"
      />
      <div ref={controls} className="mt-2 flex items-center gap-2">
        <span className="dk-hint mr-2">Drag to rotate</span>
        <button type="button" className="dk-btn" aria-label="Zoom in">+</button>
        <button type="button" className="dk-btn" aria-label="Zoom out">−</button>
        <button type="button" className="dk-btn">Reset</button>
      </div>
    </div>
  );
}

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { buildGraph } from "@/lib/notes/links";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

interface SimNode extends Point {
  id: string;
  vx: number;
  vy: number;
}

/** Simulation constants, tuned for a few hundred notes. */
const REPULSION = 5200;
const SPRING = 0.006;
const SPRING_LENGTH = 92;
const CENTER_PULL = 0.0016;
const DAMPING = 0.86;
const STEPS = 300;
/** Above this the O(n^2) repulsion pass stops being cheap enough to run inline. */
const SIM_NODE_LIMIT = 200;

/**
 * Force-directed view of the note graph.
 *
 * The layout is solved **once**, synchronously, in a memo — then Motion
 * animates each node from its seed ring to its solved position. Running the
 * simulation as a requestAnimationFrame loop would mean a re-render per step
 * (hundreds of them) and would have to read mutable positions during render,
 * which React 19 rightly flags. Solving up front is both cleaner and faster.
 *
 * Written by hand rather than pulling in d3-force: the solver is forty lines,
 * and a graph view does not justify a new dependency plus its bundle on a
 * product whose users are on mobile data.
 */
export function LinkGraph({ notes }: { notes: Note[] }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState<string | null>(null);

  const graph = useMemo(() => buildGraph(notes), [notes]);

  // Only notes that actually connect to something are worth plotting; an
  // orphan cloud tells the student nothing.
  const connected = useMemo(() => {
    const linked = new Set<string>();
    for (const edge of graph.edges) {
      linked.add(edge.source);
      linked.add(edge.target);
    }
    const nodes = graph.nodes.filter((n) => linked.has(n.id)).slice(0, SIM_NODE_LIMIT);
    const visible = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      edges: graph.edges.filter((e) => visible.has(e.source) && visible.has(e.target)),
    };
  }, [graph]);

  /** Starting ring — also the "from" position for the entrance animation. */
  const seed = useMemo(() => {
    const count = connected.nodes.length;
    const map = new Map<string, Point>();
    connected.nodes.forEach((node, index) => {
      const angle = (index / Math.max(1, count)) * Math.PI * 2;
      const radius = 120 + (index % 5) * 26;
      map.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    });
    return map;
  }, [connected]);

  const layout = useMemo(
    () => solveLayout(connected.nodes, connected.edges, seed),
    [connected, seed],
  );

  const neighbours = useMemo(() => {
    if (!hovered) return new Set<string>();
    const set = new Set<string>([hovered]);
    for (const edge of connected.edges) {
      if (edge.source === hovered) set.add(edge.target);
      if (edge.target === hovered) set.add(edge.source);
    }
    return set;
  }, [hovered, connected.edges]);

  const viewBox = useMemo(() => {
    const points = [...layout.values()];
    if (points.length === 0) return "0 0 100 100";
    const pad = 90;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  }, [layout]);

  if (connected.nodes.length === 0) return null;

  return (
    <svg
      viewBox={viewBox}
      className="h-[62vh] w-full touch-none select-none"
      role="img"
      aria-label={`Graph of ${connected.nodes.length} linked notes`}
    >
      <g>
        {connected.edges.map((edge, index) => {
          const a = layout.get(edge.source);
          const b = layout.get(edge.target);
          if (!a || !b) return null;
          const active =
            !hovered || (neighbours.has(edge.source) && neighbours.has(edge.target));
          return (
            <motion.line
              key={index}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--border)"
              strokeWidth={active ? 1.4 : 0.8}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: active ? 0.9 : 0.25 }}
              transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.25 }}
            />
          );
        })}
      </g>

      <g>
        {connected.nodes.map((node, index) => {
          const point = layout.get(node.id);
          const from = seed.get(node.id) ?? point;
          if (!point || !from) return null;

          const active = !hovered || neighbours.has(node.id);
          const radius = 5 + Math.min(9, node.degree * 1.7);

          return (
            <motion.g
              key={node.id}
              className="cursor-pointer"
              initial={
                reduceMotion
                  ? false
                  : { x: from.x, y: from.y, opacity: 0 }
              }
              animate={{ x: point.x, y: point.y, opacity: active ? 1 : 0.3 }}
              transition={{
                duration: reduceMotion ? 0 : 0.75,
                delay: reduceMotion ? 0 : Math.min(index * 0.012, 0.4),
                ease: [0.22, 1, 0.36, 1],
              }}
              onMouseEnter={() => setHovered(node.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => router.push(`/app/notes/${node.id}`)}
            >
              <circle
                r={radius}
                fill={node.id === hovered ? "var(--primary)" : "var(--chart-1)"}
                opacity={node.id === hovered ? 1 : 0.85}
              />
              <text
                y={radius + 13}
                textAnchor="middle"
                className={cn(
                  "pointer-events-none",
                  node.id === hovered ? "fill-foreground" : "fill-muted-foreground",
                )}
                style={{ fontSize: 11 }}
              >
                {node.title.length > 22 ? `${node.title.slice(0, 21)}…` : node.title}
              </text>
            </motion.g>
          );
        })}
      </g>
    </svg>
  );
}

/** Runs the force simulation to a settled state and returns final positions. */
function solveLayout(
  nodes: { id: string }[],
  edges: { source: string; target: string }[],
  seed: Map<string, Point>,
): Map<string, Point> {
  const sim: SimNode[] = nodes.map((node) => {
    const start = seed.get(node.id) ?? { x: 0, y: 0 };
    return { id: node.id, x: start.x, y: start.y, vx: 0, vy: 0 };
  });
  const byId = new Map(sim.map((n) => [n.id, n]));

  for (let step = 0; step < STEPS; step += 1) {
    for (let i = 0; i < sim.length; i += 1) {
      for (let j = i + 1; j < sim.length; j += 1) {
        const a = sim[i];
        const b = sim[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 0.01) {
          // Perfectly coincident nodes would produce NaN; nudge them apart.
          dx = (i - j) * 0.05 || 0.05;
          dy = 0.05;
          distSq = dx * dx + dy * dy;
        }
        const dist = Math.sqrt(distSq);
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    for (const edge of edges) {
      const a = byId.get(edge.source);
      const b = byId.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - SPRING_LENGTH) * SPRING;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const node of sim) {
      node.vx -= node.x * CENTER_PULL;
      node.vy -= node.y * CENTER_PULL;
      node.vx *= DAMPING;
      node.vy *= DAMPING;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  return new Map(sim.map((n) => [n.id, { x: n.x, y: n.y }]));
}

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
 * The fixed coordinate box every layout is projected into.
 *
 * Module scope rather than component scope so the projection memo does not
 * have to take them as dependencies. See the note on `placed` below for why
 * the box is fixed at all.
 */
const BOX_W = 1000;
const BOX_H = 620;
/** Readable against BOX_W; see `placed`. */
const LABEL_SIZE = 13;

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
    const nodes = graph.nodes
      .filter((n) => linked.has(n.id))
      .slice(0, SIM_NODE_LIMIT);
    const visible = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      edges: graph.edges.filter(
        (e) => visible.has(e.source) && visible.has(e.target),
      ),
    };
  }, [graph]);

  /** Starting ring — also the "from" position for the entrance animation. */
  const seed = useMemo(() => {
    const count = connected.nodes.length;
    const map = new Map<string, Point>();
    connected.nodes.forEach((node, index) => {
      const angle = (index / Math.max(1, count)) * Math.PI * 2;
      const radius = 120 + (index % 5) * 26;
      map.set(node.id, {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
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

  /**
   * The solved layout, rescaled into the FIXED coordinate box above.
   *
   * The `viewBox` used to auto-fit the layout's own extent, which meant its
   * width varied with how far the simulation spread — a few hundred units
   * for a handful of linked notes, a few thousand for a full vault. Every
   * fixed-size thing drawn inside it (labels at `font-size: 11`, node radii,
   * stroke widths) is measured in those same units, so all of them shrank on
   * screen as a vault grew. That is backwards: the day the graph most needs
   * to be readable is the day there is a lot on it.
   *
   * Normalising the positions instead of the viewBox keeps one unit worth a
   * constant number of screen pixels, so a label is the same size whether it
   * is plotting twelve notes or a hundred. Aspect ratio is preserved, so the
   * shape of the graph is not distorted to fill the box.
   */
  const { placed, placedSeed } = useMemo(() => {
    const points = [...layout.values()];
    const placed = new Map<string, Point>();
    const placedSeed = new Map<string, Point>();
    if (points.length === 0) return { placed, placedSeed };

    const pad = 70;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // `|| 1` guards the single-node and perfectly-collinear cases, where one
    // of these spans is zero and the scale would divide by it.
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min(
      (BOX_W - pad * 2) / spanX,
      (BOX_H - pad * 2) / spanY,
    );

    // Centre whatever is left over, so a wide graph does not hug the top and
    // a tall one does not hug the left.
    const offsetX = (BOX_W - spanX * scale) / 2;
    const offsetY = (BOX_H - spanY * scale) / 2;

    const project = (p: Point): Point => ({
      x: (p.x - minX) * scale + offsetX,
      y: (p.y - minY) * scale + offsetY,
    });

    for (const [id, p] of layout) placed.set(id, project(p));
    // The entrance animates from the seed ring, so it has to travel through
    // the SAME transform — left in raw simulation space it would fly in from
    // somewhere off the top-left of the box instead of from the ring.
    for (const [id, p] of seed) placedSeed.set(id, project(p));

    return { placed, placedSeed };
  }, [layout, seed]);

  if (connected.nodes.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${BOX_W} ${BOX_H}`}
      className="h-[62vh] w-full touch-none select-none"
      role="img"
      aria-label={`Graph of ${connected.nodes.length} linked notes`}
    >
      <g>
        {connected.edges.map((edge, index) => {
          const a = placed.get(edge.source);
          const b = placed.get(edge.target);
          if (!a || !b) return null;
          const active =
            !hovered ||
            (neighbours.has(edge.source) && neighbours.has(edge.target));
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
          const point = placed.get(node.id);
          const from = placedSeed.get(node.id) ?? point;
          if (!point || !from) return null;

          const active = !hovered || neighbours.has(node.id);
          const radius = 5 + Math.min(9, node.degree * 1.7);

          return (
            <motion.g
              key={node.id}
              className="cursor-pointer"
              initial={
                reduceMotion ? false : { x: from.x, y: from.y, opacity: 0 }
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
                y={radius + LABEL_SIZE + 4}
                textAnchor="middle"
                // A stroke the same colour as the page behind it, wider than
                // the glyphs and painted first, is a text halo: it keeps a
                // label readable crossing an edge line or another node
                // without a background rect that would itself need sizing
                // per label. paint-order is what makes the stroke sit under
                // the fill instead of over it.
                stroke="var(--card)"
                strokeWidth={LABEL_SIZE * 0.32}
                paintOrder="stroke fill"
                className={cn(
                  "pointer-events-none",
                  node.id === hovered
                    ? "fill-foreground"
                    : "fill-muted-foreground",
                )}
                style={{ fontSize: LABEL_SIZE }}
              >
                {node.title.length > 22
                  ? `${node.title.slice(0, 21)}…`
                  : node.title}
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

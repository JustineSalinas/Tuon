"use client";

/**
 * The hero's backdrop: a forest, drawn the way Tala is — soft gradient-shaded
 * shapes, no filters — because the landing page is now permanently dark and
 * forest (see `page.tsx`), and a page that commits to one hue for everyone
 * should spend it on something more specific than a blurred circle.
 *
 * Three depth layers parallax at different rates on mouse move (desktop only,
 * and skipped entirely under `prefers-reduced-motion`): the back canopy barely
 * moves, the front trees move the most, which is what actually sells depth —
 * matching speed on every layer reads as one flat image sliding, not a scene
 * with things nearer and farther in it. Each tree also sways on its own
 * independent loop, anchored at its trunk base so the canopy is what moves,
 * the way a real crown does in still air rather than a gust.
 *
 * Tala gets an actual branch in here, off to one side, independent of
 * `TalaPerch` — that one is the interactive "ask a question" entry point
 * elsewhere in the hero; this is just her other place to be.
 */

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import { PaperCreature } from "@/components/brand/paper-creature";

const GREENS = {
  back: ["#16261D", "#1C3326"],
  mid: ["#1E3B2B", "#2A4F38"],
  front: ["#234731", "#1A3226"],
  trunk: "#2A1E14",
};

/** One pine-ish tree: a trunk plus three stacked, overlapping canopy tiers. */
function Tree({
  id,
  x,
  baseY,
  scale,
  tone,
  swayDuration,
  swayDelay,
  reduceMotion,
}: {
  id: string;
  x: number;
  baseY: number;
  scale: number;
  tone: readonly [string, string];
  swayDuration: number;
  swayDelay: number;
  reduceMotion: boolean;
}) {
  const gradId = `${id}-canopy`;
  const trunkH = 46 * scale;
  const trunkW = 7 * scale;

  return (
    <g transform={`translate(${x} ${baseY})`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone[1]} />
          <stop offset="100%" stopColor={tone[0]} />
        </linearGradient>
      </defs>

      {/* Trunk — stays put; only the canopy group sways. */}
      <rect
        x={-trunkW / 2}
        y={-trunkH}
        width={trunkW}
        height={trunkH}
        rx={trunkW / 2}
        fill={GREENS.trunk}
      />

      <motion.g
        style={{ transformOrigin: `0px ${-trunkH}px` }}
        animate={
          reduceMotion
            ? undefined
            : { rotate: [-1.4, 1.6, -1.4] }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration: swayDuration,
                delay: swayDelay,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      >
        {[0, 1, 2].map((tier) => {
          const w = (74 - tier * 20) * scale;
          const h = (56 - tier * 10) * scale;
          const y = -trunkH - tier * 30 * scale;
          return (
            <path
              key={tier}
              d={`M0 ${y - h} L${w / 2} ${y} Q0 ${y + h * 0.22} ${-w / 2} ${y} Z`}
              fill={`url(#${gradId})`}
            />
          );
        })}
      </motion.g>
    </g>
  );
}

const BACK_TREES = [
  { id: "b1", x: 60, scale: 1.5, sway: 9.5 },
  { id: "b2", x: 320, scale: 1.9, sway: 11 },
  { id: "b3", x: 620, scale: 1.6, sway: 8.5 },
  { id: "b4", x: 980, scale: 2.1, sway: 10.5 },
  { id: "b5", x: 1280, scale: 1.7, sway: 9 },
  { id: "b6", x: 1520, scale: 1.5, sway: 11.5 },
] as const;

const MID_TREES = [
  { id: "m1", x: 160, scale: 2.4, sway: 7 },
  { id: "m2", x: 520, scale: 2.0, sway: 8 },
  { id: "m3", x: 1060, scale: 2.6, sway: 6.5 },
  { id: "m4", x: 1420, scale: 2.1, sway: 7.5 },
] as const;

const FRONT_TREES = [
  { id: "f1", x: -40, scale: 3.6, sway: 5.5 },
  { id: "f2", x: 1640, scale: 3.9, sway: 6 },
] as const;

export function ForestScene() {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 60, damping: 20 });
  const smy = useSpring(my, { stiffness: 60, damping: 20 });

  const backX = useTransform(smx, [-1, 1], [-6, 6]);
  const backY = useTransform(smy, [-1, 1], [-3, 3]);
  const midX = useTransform(smx, [-1, 1], [-16, 16]);
  const midY = useTransform(smy, [-1, 1], [-8, 8]);
  const frontX = useTransform(smx, [-1, 1], [-30, 30]);
  const frontY = useTransform(smy, [-1, 1], [-14, 14]);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    my.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function onPointerLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={ref}
      aria-hidden="true"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      // Bounded to roughly the fold, not the whole (much taller) hero
      // section: stretching the viewBox across the full scrollable height
      // forces "slice" scaling to cover a far taller-than-wide area, which
      // blows the canopy up and pushes anything placed past viewBox-centre
      // (the branch, Tala) off the right edge of the screen entirely — a
      // real bug this comment is here so nobody re-introduces by switching
      // back to `inset-0` for a "fuller" backdrop.
      className="pointer-events-auto absolute inset-x-0 top-0 hidden h-[640px] overflow-hidden md:block lg:h-[720px]"
    >
      {/* Canopy glow — stands in for the old blurred circle, now tinted to
          match rather than being a leftover from the generic theme. */}
      <div className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(111,164,120,0.16),transparent_70%)] blur-3xl" />

      <motion.svg
        viewBox="0 0 1600 500"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full"
        style={{ x: backX, y: backY }}
      >
        {BACK_TREES.map((t, i) => (
          <Tree
            key={t.id}
            id={t.id}
            x={t.x}
            baseY={500}
            scale={t.scale}
            tone={GREENS.back as [string, string]}
            swayDuration={t.sway}
            swayDelay={i * 0.6}
            reduceMotion={reduceMotion}
          />
        ))}
      </motion.svg>

      <motion.svg
        viewBox="0 0 1600 500"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full"
        style={{ x: midX, y: midY }}
      >
        {MID_TREES.map((t, i) => (
          <Tree
            key={t.id}
            id={t.id}
            x={t.x}
            baseY={500}
            scale={t.scale}
            tone={GREENS.mid as [string, string]}
            swayDuration={t.sway}
            swayDelay={i * 0.8 + 0.3}
            reduceMotion={reduceMotion}
          />
        ))}
      </motion.svg>

      <motion.svg
        viewBox="0 0 1600 500"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 size-full"
        style={{ x: frontX, y: frontY }}
      >
        {FRONT_TREES.map((t, i) => (
          <Tree
            key={t.id}
            id={t.id}
            x={t.x}
            baseY={520}
            scale={t.scale}
            tone={GREENS.front as [string, string]}
            swayDuration={t.sway}
            swayDelay={i * 0.4}
            reduceMotion={reduceMotion}
          />
        ))}

        {/* A branch for Tala, growing off the right-hand front tree. */}
        <path
          d="M1600 310 C 1480 300 1400 312 1330 296"
          fill="none"
          stroke={GREENS.trunk}
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* `foreignObject` rather than a CSS-positioned div sitting on top of
            the SVG: it shares this element's exact viewBox and
            preserveAspectRatio transform, so Tala stays on the branch above
            at every viewport width instead of drifting apart from it — a
            sibling div positioned by CSS percentage has no way to know how
            "xMidYMax slice" cropped and scaled the coordinate space it is
            trying to match. */}
        <foreignObject x={1250} y={210} width={120} height={120}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <PaperCreature state="idle" className="size-28 -scale-x-100" />
          </motion.div>
        </foreignObject>
      </motion.svg>
    </div>
  );
}

"use client";

/**
 * The real, WebGL version of the hero's forest — see `forest-scene.tsx` for
 * the wrapper that mounts this (dynamically, client-only: a Canvas needs
 * `window` and cannot be part of the server-rendered tree) and for why a
 * branch and Tala's DOM-based face live in here rather than being a second,
 * separately-positioned layer — that split is exactly the bug the SVG
 * version hit first.
 *
 * Tala herself is NOT rendered in here — drei's `Html` (the obvious tool for
 * "anchor a DOM node to a 3D point") turned out to silently fail to mount
 * its portal in this React 19 + Turbopack-dev combination, with nothing
 * thrown to catch. Rather than fight that, `TalaProjector` below does the
 * same job by hand: every frame it projects her branch's world position
 * through this exact camera into pixel space and writes the result straight
 * onto a DOM node's `transform` via a ref — no React state, no portal,
 * nothing for a reconciler to get confused about. The actual `<PaperCreature
 * />` renders as a sibling of the Canvas in `forest-scene.tsx`, which is
 * also why she needs no fallback position here: `forest-scene.tsx` starts
 * her off-screen until the first frame places her for real, so there's
 * never a flash at the wrong spot.
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";

const BG = "#0d1612";

/** World position of Tala's branch — the one spot `forest-scene.tsx` also
 *  needs to know, to decide where her wing-tip should sit on it. */
export const TALA_ANCHOR = new THREE.Vector3(9.3, 2.72, 1.2);
const TRUNK = "#2a1e14";
const CANOPY_BY_DEPTH = {
  back: "#16261d",
  mid: "#1f3c2b",
  front: "#2c5a3c",
} as const;

type Depth = keyof typeof CANOPY_BY_DEPTH;

interface TreeSpec {
  x: number;
  z: number;
  scale: number;
  depth: Depth;
  swaySpeed: number;
  swayPhase: number;
}

/** Deterministic, not random — a server-rendered… no, client-only, but still:
 *  a fixed layout reads as composed; `Math.random()` here would reshuffle the
 *  forest on every Fast Refresh and every visitor, which is just noise. */
const TREES: TreeSpec[] = [
  { x: -9.5, z: -10, scale: 2.1, depth: "back", swaySpeed: 0.26, swayPhase: 0 },
  { x: -5.5, z: -11, scale: 2.6, depth: "back", swaySpeed: 0.22, swayPhase: 1.1 },
  { x: -1, z: -12, scale: 2.3, depth: "back", swaySpeed: 0.3, swayPhase: 2.4 },
  { x: 4, z: -10.5, scale: 2.8, depth: "back", swaySpeed: 0.24, swayPhase: 0.6 },
  { x: 8.5, z: -11.5, scale: 2.2, depth: "back", swaySpeed: 0.28, swayPhase: 3.1 },

  { x: -8, z: -6, scale: 3.4, depth: "mid", swaySpeed: 0.34, swayPhase: 0.3 },
  { x: -3, z: -7, scale: 3.9, depth: "mid", swaySpeed: 0.3, swayPhase: 1.8 },
  { x: 3.5, z: -6.5, scale: 3.6, depth: "mid", swaySpeed: 0.36, swayPhase: 2.9 },
  { x: 7.5, z: -7.5, scale: 3.2, depth: "mid", swaySpeed: 0.32, swayPhase: 0.9 },

  { x: -11, z: -1.5, scale: 5.2, depth: "front", swaySpeed: 0.4, swayPhase: 0.2 },
  { x: -6.5, z: -2.5, scale: 4.4, depth: "front", swaySpeed: 0.44, swayPhase: 2.1 },
  { x: 10.5, z: -2, scale: 5.6, depth: "front", swaySpeed: 0.38, swayPhase: 1.4 },
];

/** Deterministic per-tree jitter, seeded off position rather than
 *  Math.random() — same reasoning as TREES being a fixed layout: a forest
 *  where every tree is an identical cone stack scaled up or down reads as
 *  obviously procedural, but true randomness would reshuffle on every Fast
 *  Refresh. A cheap hash of each tree's own coordinates gives irregularity
 *  that's stable across renders without needing a seed prop threaded in. */
function hash(n: number) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function Tree({ x, z, scale, depth, swaySpeed, swayPhase }: TreeSpec) {
  const canopyRef = useRef<THREE.Group>(null);
  const reduceMotion = useReducedMotionFlag();
  const seed = x * 7.13 + z * 3.71;

  useFrame(({ clock }) => {
    if (reduceMotion || !canopyRef.current) return;
    const t = clock.getElapsedTime();
    canopyRef.current.rotation.z =
      Math.sin(t * swaySpeed + swayPhase) * 0.045;
  });

  const trunkH = 1.1 * scale;
  const baseColor = useMemo(() => new THREE.Color(CANOPY_BY_DEPTH[depth]), [depth]);
  // Small per-tree lightness jitter so a stand of trees isn't three flat,
  // repeated colour swatches — real foliage never is.
  const color = useMemo(() => {
    const amount = (hash(seed) - 0.5) * 0.12;
    return baseColor.clone().offsetHSL(0, 0, amount);
  }, [baseColor, seed]);
  const yRotation = hash(seed + 1) * Math.PI * 2;

  return (
    <group position={[x, 0, z]} rotation={[0, yRotation, 0]}>
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07 * scale, 0.1 * scale, trunkH, 7]} />
        <meshStandardMaterial color={TRUNK} roughness={0.9} />
      </mesh>

      <group ref={canopyRef} position={[0, trunkH, 0]}>
        {[0, 1, 2].map((tier) => {
          // Each tier leans a little off-centre, rather than stacking dead
          // straight — the asymmetry is most of what reads as "grown" rather
          // than "extruded".
          const lean = (hash(seed + tier * 2.3) - 0.5) * 0.32 * scale;
          const tierScale = 1 - tier * 0.22 + (hash(seed + tier) - 0.5) * 0.08;
          const h = 1.5 * scale * tierScale;
          const r = 0.85 * scale * tierScale;
          const y = tier * 0.85 * scale;
          return (
            <mesh key={tier} position={[lean, y + h / 2, 0]} castShadow>
              <coneGeometry args={[r, h, 9]} />
              <meshStandardMaterial
                color={color}
                roughness={0.78}
                metalness={0.04}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/** The forest floor. Without it the trunks read as planted in void — a flat
 *  plane this dark barely shows as a shape, but it catches the directional
 *  light at a grazing angle and gives the fog something to sit on top of. */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -6]} receiveShadow>
      <planeGeometry args={[60, 40]} />
      <meshStandardMaterial color="#0a120d" roughness={1} />
    </mesh>
  );
}

/** Three soft, additive-blended shafts angled off the directional "moon"
 *  light — cheap god rays. Real volumetric light needs a raymarched shader;
 *  this is a few transparent cones, which looks convincing at the size and
 *  distance they're actually seen at here and costs nothing extra to draw. */
function LightShafts() {
  // A default cone has its apex at +height/2 and base at -height/2 — narrow
  // end already "up", which is exactly a ray converging toward a light
  // source above the scene and fanning out as it falls through the canopy.
  // Positioned so the apex sits roughly where the directional light does.
  const shafts = [
    { x: -5, y: 6, z: -9, rot: -0.3, scale: 1 },
    { x: -1, y: 5.5, z: -10, rot: -0.2, scale: 0.8 },
    { x: 3, y: 6.2, z: -8.5, rot: -0.35, scale: 1.15 },
  ];
  return (
    <>
      {shafts.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation={[0, 0, s.rot]}>
          <coneGeometry args={[1.8 * s.scale, 14, 24, 1, true]} />
          <meshBasicMaterial
            color="#bcd9c4"
            transparent
            opacity={0.035}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/** ~20 drifting motes of light. Plain emissive spheres — Bloom (added once,
 *  scene-wide, in the composer below) is what turns them into a real glow
 *  instead of a flat dot, far cheaper than giving each one its own shader. */
function Fireflies() {
  const count = 22;
  const ref = useRef<THREE.InstancedMesh>(null);
  const reduceMotion = useReducedMotionFlag();

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.sin(i * 12.9) * 0.5 + 0.5) * 20 - 10,
        y: 0.6 + (Math.cos(i * 7.3) * 0.5 + 0.5) * 3.2,
        z: -1 + (Math.sin(i * 5.1) * 0.5 + 0.5) * -9,
        speed: 0.15 + (i % 5) * 0.05,
        phase: i * 1.37,
        radius: 0.5 + (i % 4) * 0.25,
      })),
    [],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    seeds.forEach((s, i) => {
      const x = s.x + Math.sin(t * s.speed + s.phase) * s.radius;
      const y = s.y + Math.cos(t * s.speed * 1.3 + s.phase) * 0.4;
      const z = s.z + Math.cos(t * s.speed + s.phase) * s.radius * 0.6;
      dummy.position.set(x, y, z);
      const twinkle = 0.6 + Math.sin(t * 2 + s.phase) * 0.4;
      dummy.scale.setScalar(reduceMotion ? 0.7 : 0.4 + twinkle * 0.5);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.045, 8, 8]} />
      <meshBasicMaterial color="#f2c879" toneMapped={false} />
    </instancedMesh>
  );
}

/** The branch Tala sits on — just the mesh. She's a DOM sibling positioned
 *  by `TalaProjector` below; see the file header for why. */
function TalaBranch() {
  return (
    <group position={[8.4, 2.5, 1.2]}>
      <mesh rotation={[0, 0, -0.12]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 2.4, 6]} />
        <meshStandardMaterial color={TRUNK} roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * Projects `TALA_ANCHOR` through this scene's actual camera every frame and
 * writes the resulting pixel position straight onto `target`'s transform —
 * no React state, so this costs one DOM write per frame and no re-render.
 * `target` is a DOM node living outside the Canvas entirely (see
 * `forest-scene.tsx`); that's deliberate, not a workaround — the Canvas
 * itself has no use for a 2D DOM child, it only needs to know where one
 * should sit.
 */
function TalaProjector({ target }: { target: React.RefObject<HTMLDivElement | null> }) {
  const { camera, size } = useThree();
  const vec = useRef(new THREE.Vector3());

  // `target` is a plain DOM ref, not React-managed state — writing its
  // style imperatively from a per-frame callback is the entire point of
  // using a ref here instead of useState (a setState call per frame would
  // mean a React re-render per frame). The immutability rule only
  // understands React values, not this.
  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    if (!target.current) return;
    vec.current.copy(TALA_ANCHOR).project(camera);
    const x = (vec.current.x * 0.5 + 0.5) * size.width;
    const y = (-vec.current.y * 0.5 + 0.5) * size.height;
    // The target div is size-28 (112px). Offset so her feet land on the
    // branch instead of her top-left corner: centred horizontally, and
    // mostly above the anchor vertically since that's where her talons sit
    // in the artwork, not dead centre of the square.
    target.current.style.transform = `translate3d(${x - 56}px, ${y - 92}px, 0)`;
  });
  /* eslint-enable react-hooks/immutability */

  return null;
}

/** Subtle parallax: the camera eases toward the pointer rather than
 *  snapping, and only when motion is welcome. */
function ParallaxRig() {
  const { camera } = useThree();
  const reduceMotion = useReducedMotionFlag();
  const target = useRef({ x: 0, y: 0 });

  // `camera` is R3F's imperative handle onto the live three.js camera, not
  // React state — mutating it every frame outside the render cycle is the
  // documented way to drive a camera rig, and exactly what useFrame is for.
  // The immutability rule doesn't know that distinction.
  /* eslint-disable react-hooks/immutability */
  useFrame(() => {
    if (reduceMotion) return;
    camera.position.x += (target.current.x - camera.position.x) * 0.04;
    camera.position.y += (2.2 - target.current.y - camera.position.y) * 0.04;
    camera.lookAt(0, 2, -4);
  });
  /* eslint-enable react-hooks/immutability */

  useFrame(({ pointer }) => {
    target.current.x = pointer.x * 1.4;
    target.current.y = pointer.y * 0.6;
  });

  return null;
}

let cachedReduceMotion: boolean | null = null;
function useReducedMotionFlag() {
  // Read once; this scene's lifetime is the page's lifetime, and a listener
  // for a setting nobody toggles mid-session is not worth the extra moving
  // part. `cachedReduceMotion` just avoids re-querying matchMedia per tree.
  if (cachedReduceMotion === null && typeof window !== "undefined") {
    cachedReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }
  return cachedReduceMotion ?? false;
}

export function ForestScene3D({
  talaTarget,
}: {
  talaTarget: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.75]}
      camera={{ position: [0, 2.2, 9], fov: 45, near: 0.1, far: 40 }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color(BG);
        scene.fog = new THREE.Fog(BG, 8, 22);
      }}
    >
      <ambientLight intensity={0.55} color="#8fb39a" />
      <directionalLight
        position={[-6, 8, 4]}
        intensity={0.9}
        color="#bcd9c4"
      />
      <pointLight position={[8, 3, 2]} intensity={0.4} color="#f2c879" />

      <Ground />
      <LightShafts />
      {TREES.map((tree, i) => (
        <Tree key={i} {...tree} />
      ))}
      <Fireflies />
      <TalaBranch />
      <TalaProjector target={talaTarget} />
      <ParallaxRig />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.65}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}

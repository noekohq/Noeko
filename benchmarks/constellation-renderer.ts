import type { IEdge, INode } from "../src/declarations/graph";
import {
  WebGLGraphRenderer,
  type INodePosition,
} from "../src/domains/constellation/components/Graph/webgl/WebGLRenderer";

type BenchmarkResult = {
  nodes: number;
  edges: number;
  frames: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
};

declare global {
  interface Window {
    constellationBenchmark?: Promise<BenchmarkResult>;
  }
}

const params = new URLSearchParams(window.location.search);
const nodeCount = Math.max(1, Number(params.get("nodes")) || 1_000);
const edgesPerNode = Math.max(0, Number(params.get("edgesPerNode")) || 3);
const frameCount = Math.max(30, Number(params.get("frames")) || 180);
const mode = params.get("mode") === "pan" ? "pan" : "dynamic";
const canvas = document.querySelector<HTMLCanvasElement>("#graph");
const labels = document.querySelector<HTMLCanvasElement>("#labels");
const output = document.querySelector<HTMLOutputElement>("#result");

if (!canvas || !labels || !output) throw new Error("Benchmark elements are unavailable");

const nodes = Array.from({ length: nodeCount }, (_, index) => {
  const type = (["idea", "source", "task", "excerpt", "tag", "rabbithole", "user"] as const)[
    index % 7
  ];
  return {
    id: `benchmark:${index}`,
    type,
    label: `Benchmark node ${index}`,
    summary: true,
  } as INode;
});

const edges: IEdge[] = [];
for (let source = 0; source < nodeCount; source += 1) {
  for (let offset = 1; offset <= edgesPerNode; offset += 1) {
    const target = (source + offset * 17) % nodeCount;
    if (source === target) continue;
    edges.push({
      id: `benchmark-edge:${source}:${target}`,
      source: `benchmark:${source}`,
      target: `benchmark:${target}`,
      distance: 75,
      strength: 0.3,
      visibility: offset === 1 ? "high" : "low",
    });
  }
}

const positions = new Map<string, INodePosition>();
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
for (let index = 0; index < nodeCount; index += 1) {
  const angle = index * goldenAngle;
  const radius = Math.sqrt(index) * 22;
  positions.set(`benchmark:${index}`, {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  });
}

const renderer = new WebGLGraphRenderer(canvas, labels);
renderer.resize(window.innerWidth, window.innerHeight);
const selected = new Set<string>();
const highlighted = new Set<string>();
const samples: number[] = [];

const percentile = (sorted: number[], value: number) =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))];

window.constellationBenchmark = new Promise<BenchmarkResult>((resolve) => {
  let frame = 0;
  const run = () => {
    if (mode === "dynamic" || frame === 0) {
      selected.clear();
      highlighted.clear();
      selected.add(`benchmark:${frame % nodeCount}`);
      highlighted.add(`benchmark:${(frame * 11) % nodeCount}`);
    }

    const start = performance.now();
    renderer.draw({
      nodes,
      edges,
      positions,
      viewport: {
        scale: 0.7,
        x: window.innerWidth / 2 + (mode === "pan" ? Math.sin(frame / 12) * 180 : 0),
        y: window.innerHeight / 2,
      },
      selected,
      highlighted,
      positionRevision: 0,
      styleRevision: mode === "dynamic" ? frame : 0,
    });
    samples.push(performance.now() - start);
    frame += 1;

    if (frame < frameCount) {
      requestAnimationFrame(run);
      return;
    }

    const sorted = samples.slice().sort((left, right) => left - right);
    const result: BenchmarkResult = {
      nodes: nodeCount,
      edges: edges.length,
      frames: frameCount,
      meanMs: samples.reduce((sum, sample) => sum + sample, 0) / samples.length,
      p95Ms: percentile(sorted, 0.95),
      maxMs: sorted[sorted.length - 1],
    };
    output.value = JSON.stringify(result, null, 2);
    resolve(result);
  };

  requestAnimationFrame(run);
});

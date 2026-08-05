import type { IEdge, INode } from "@/declarations/graph";
import { getNodeTitle } from "@infrastructure/graph/utils";

export type IGraphViewport = {
  scale: number;
  x: number;
  y: number;
};

export type INodePosition = {
  x: number;
  y: number;
};

type IRenderState = {
  nodes: INode[];
  edges: IEdge[];
  positions: Map<string, INodePosition>;
  viewport: IGraphViewport;
  selected: Set<string>;
  highlighted: Set<string>;
  focused?: string;
  hovered?: string;
  interactionSource?: string;
  loading?: boolean;
  filter?: (nodeId: string, node?: INode) => boolean;
  positionRevision?: number;
  styleRevision?: number;
  time?: number;
};

type RGB = [number, number, number];

type INodeTheme = {
  fill: RGB;
  stroke: RGB;
  radius: number;
  hoverRadius: number;
  strokeWidth: number;
  labelScale: number;
};

type IRendererTheme = {
  nodes: Record<INode["type"], INodeTheme>;
  highlightRing: RGB;
  focusRing: RGB;
  edge: RGB;
  selectedEdge: RGB;
  unselectedEdge: RGB;
  label: string;
  selectedLabel: string;
  fontFamily: string;
  fontSize: number;
};

type INodeTransition = {
  radius: number;
  opacity: number;
  startRadius: number;
  startOpacity: number;
  targetRadius: number;
  targetOpacity: number;
  startedAt: number;
};

type IEdgeTransition = {
  color: RGB;
  opacity: number;
  width: number;
  startColor: RGB;
  startOpacity: number;
  startWidth: number;
  targetColor: RGB;
  targetOpacity: number;
  targetWidth: number;
  startedAt: number;
  effectKey?: string;
  effectOriginAtSource: boolean;
  effectStartedAt: number;
  effectStartColor: RGB;
  effectStartOpacity: number;
};

const NODE_FLOATS = 18;
const EDGE_FLOATS = 12;
const TRANSITION_DURATION = 200;
const EDGE_TRANSITION_DURATION = 320;
const EDGE_GLIMMER_DURATION = 600;
const EDGE_GLIMMER_SPEED = 1.8;
const EDGE_PATH_DELAY = 55;
const MAX_PATH_HOPS = 8;
const EDGE_VERTEX_ALONG = [0, 0, 1, 1, 0, 1] as const;
const EDGE_VERTEX_SIDE = [1, -1, 1, 1, -1, -1] as const;

const NODE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec4 a_fill;
in vec4 a_stroke;
in vec4 a_ring;
in vec4 a_metrics;
uniform vec2 u_resolution;
uniform vec3 u_viewport;
uniform float u_pixel_ratio;
out vec4 v_fill;
out vec4 v_stroke;
out vec4 v_ring;
out vec4 v_metrics;
out float v_point_size;
void main() {
  vec2 screen = a_position * u_viewport.x + u_viewport.yz;
  vec2 clip = screen / u_resolution * 2.0 - 1.0;
  float mainOuter = a_metrics.x + a_metrics.y * 0.5;
  float ringOuter = a_metrics.z + a_metrics.w * 0.5;
  float pointSize = (max(mainOuter, ringOuter) + 1.5) * 2.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = pointSize * u_viewport.x * u_pixel_ratio;
  v_fill = a_fill;
  v_stroke = a_stroke;
  v_ring = a_ring;
  v_metrics = a_metrics;
  v_point_size = pointSize;
}`;

const NODE_FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec4 v_fill;
in vec4 v_stroke;
in vec4 v_ring;
in vec4 v_metrics;
in float v_point_size;
out vec4 outColor;
void main() {
  float distancePx = length(gl_PointCoord - vec2(0.5)) * v_point_size;
  float radius = v_metrics.x;
  float strokeWidth = v_metrics.y;
  float ringRadius = v_metrics.z;
  float ringWidth = v_metrics.w;
  float antialias = 0.9;

  float mainOuter = radius + strokeWidth * 0.5;
  float mainCoverage = 1.0 - smoothstep(mainOuter - antialias, mainOuter + antialias, distancePx);
  float strokeStart = max(0.0, radius - strokeWidth * 0.5);
  float strokeMix = smoothstep(strokeStart - antialias, strokeStart + antialias, distancePx);
  vec4 mainColor = mix(v_fill, v_stroke, strokeMix);
  mainColor.a *= mainCoverage;

  float ringDistance = abs(distancePx - ringRadius);
  float ringCoverage = 1.0 - smoothstep(
    ringWidth * 0.5 - antialias,
    ringWidth * 0.5 + antialias,
    ringDistance
  );
  vec4 ringColor = v_ring;
  ringColor.a *= ringCoverage;

  float outputAlpha = mainColor.a + ringColor.a * (1.0 - mainColor.a);
  if (outputAlpha <= 0.001) discard;
  vec3 outputRgb = (
    mainColor.rgb * mainColor.a + ringColor.rgb * ringColor.a * (1.0 - mainColor.a)
  ) / outputAlpha;
  outColor = vec4(outputRgb, outputAlpha);
}`;

const EDGE_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec4 a_color;
in vec4 a_target_color;
in vec2 a_effect;
uniform vec2 u_resolution;
uniform vec3 u_viewport;
out vec4 v_color;
out vec4 v_target_color;
out float v_distance;
out float v_wave_radius;
void main() {
  vec2 screen = a_position * u_viewport.x + u_viewport.yz;
  vec2 clip = screen / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_color = a_color;
  v_target_color = a_target_color;
  v_distance = a_effect.x * u_viewport.x;
  v_wave_radius = a_effect.y;
}`;

const EDGE_FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec4 v_color;
in vec4 v_target_color;
in float v_distance;
in float v_wave_radius;
out vec4 outColor;
void main() {
  float hasWave = step(0.0, v_wave_radius);
  float revealed = 1.0 - smoothstep(v_wave_radius - 18.0, v_wave_radius + 4.0, v_distance);
  revealed = mix(1.0, revealed, hasWave);
  vec4 resolved = mix(v_color, v_target_color, revealed);
  float glimmer = 1.0 - smoothstep(3.0, 22.0, abs(v_distance - v_wave_radius));
  glimmer *= hasWave;
  vec3 color = mix(resolved.rgb, vec3(1.0), glimmer * 0.3);
  outColor = vec4(color, min(1.0, resolved.a + glimmer * 0.2));
}`;

const parseColor = (value: string, fallback: RGB): RGB => {
  const color = value.trim();
  const shortHex = color.match(/^#([\da-f])([\da-f])([\da-f])$/i);
  if (shortHex) {
    return shortHex.slice(1).map((part) => parseInt(`${part}${part}`, 16) / 255) as RGB;
  }
  const hex = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/i);
  if (hex) return hex.slice(1).map((part) => parseInt(part, 16) / 255) as RGB;
  const rgb = color.match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/i);
  if (rgb) return rgb.slice(1, 4).map((part) => Number(part) / 255) as RGB;
  return fallback;
};

const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader compilation error";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
};

const createProgram = (gl: WebGL2RenderingContext, vertex: string, fragment: string) => {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create WebGL program");
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) || "Unknown WebGL linking error";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
};

const getStringPhase = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash % 400);
};

const getStableRatio = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

const wrapLabel = (
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines = 3
) => {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  const consumed = lines.join(" ").split(/\s+/).length;
  if (consumed < words.length && lines.length > 0) {
    let lastLine = lines[lines.length - 1];
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${lastLine}…`;
  }
  return lines;
};

export class WebGLGraphRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly labelCanvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly labelContext: CanvasRenderingContext2D;
  private readonly nodeProgram: WebGLProgram;
  private readonly edgeProgram: WebGLProgram;
  private readonly nodeBuffer: WebGLBuffer;
  private readonly edgeBuffer: WebGLBuffer;
  private readonly nodeLocations: {
    position: number;
    fill: number;
    stroke: number;
    ring: number;
    metrics: number;
    resolution: WebGLUniformLocation;
    viewport: WebGLUniformLocation;
    pixelRatio: WebGLUniformLocation;
  };
  private readonly edgeLocations: {
    position: number;
    color: number;
    targetColor: number;
    effect: number;
    resolution: WebGLUniformLocation;
    viewport: WebGLUniformLocation;
  };
  private nodeVertices = new Float32Array(0);
  private edgeVertices = new Float32Array(0);
  private nodeVertexCount = 0;
  private edgeVertexCount = 0;
  private lastNodes: INode[] | undefined;
  private lastEdges: IEdge[] | undefined;
  private lastPositionRevision: number | undefined;
  private lastStyleRevision: number | undefined;
  private lastEdgeLodKey: number | undefined;
  private labelPriorityNodes: INode[] = [];
  private lastLabelNodes: INode[] | undefined;
  private lastLabelStyleRevision: number | undefined;
  private nodeTransitions = new Map<string, INodeTransition>();
  private edgeTransitions = new Map<string, IEdgeTransition>();
  private pathEdges: IEdge[] | undefined;
  private pathAdjacency = new Map<string, string[]>();
  private pathSource: string | undefined;
  private pathDistances = new Map<string, number>();
  private hasActiveTransitions = false;
  private hasActiveEdgeTransitions = false;
  private theme!: IRendererTheme;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;

  constructor(canvas: HTMLCanvasElement, labelCanvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    const labelContext = labelCanvas.getContext("2d");
    if (!gl || !labelContext) throw new Error("WebGL2 rendering is unavailable");

    const nodeBuffer = gl.createBuffer();
    const edgeBuffer = gl.createBuffer();
    if (!nodeBuffer || !edgeBuffer) throw new Error("Unable to create WebGL buffers");

    this.canvas = canvas;
    this.labelCanvas = labelCanvas;
    this.gl = gl;
    this.labelContext = labelContext;
    this.nodeProgram = createProgram(gl, NODE_VERTEX_SHADER, NODE_FRAGMENT_SHADER);
    this.edgeProgram = createProgram(gl, EDGE_VERTEX_SHADER, EDGE_FRAGMENT_SHADER);
    this.nodeBuffer = nodeBuffer;
    this.edgeBuffer = edgeBuffer;
    this.nodeLocations = {
      position: gl.getAttribLocation(this.nodeProgram, "a_position"),
      fill: gl.getAttribLocation(this.nodeProgram, "a_fill"),
      stroke: gl.getAttribLocation(this.nodeProgram, "a_stroke"),
      ring: gl.getAttribLocation(this.nodeProgram, "a_ring"),
      metrics: gl.getAttribLocation(this.nodeProgram, "a_metrics"),
      resolution: this.getUniformLocation(this.nodeProgram, "u_resolution"),
      viewport: this.getUniformLocation(this.nodeProgram, "u_viewport"),
      pixelRatio: this.getUniformLocation(this.nodeProgram, "u_pixel_ratio"),
    };
    this.edgeLocations = {
      position: gl.getAttribLocation(this.edgeProgram, "a_position"),
      color: gl.getAttribLocation(this.edgeProgram, "a_color"),
      targetColor: gl.getAttribLocation(this.edgeProgram, "a_target_color"),
      effect: gl.getAttribLocation(this.edgeProgram, "a_effect"),
      resolution: this.getUniformLocation(this.edgeProgram, "u_resolution"),
      viewport: this.getUniformLocation(this.edgeProgram, "u_viewport"),
    };

    this.refreshTheme();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  private getUniformLocation(program: WebGLProgram, name: string) {
    const location = this.gl.getUniformLocation(program, name);
    if (!location) throw new Error(`Unable to locate WebGL uniform ${name}`);
    return location;
  }

  refreshTheme() {
    const styles = getComputedStyle(document.documentElement);
    const color = (name: string, fallback: RGB) =>
      parseColor(styles.getPropertyValue(name), fallback);
    const dark9 = color("--mantine-color-dark-9", [0.06, 0.07, 0.09]);
    const dark4 = color("--mantine-color-dark-4", [0.55, 0.58, 0.62]);
    const standard = (fill: RGB, stroke: RGB): INodeTheme => ({
      fill,
      stroke,
      radius: 18,
      hoverRadius: 24,
      strokeWidth: 2,
      labelScale: 1,
    });
    const organizer = (stroke: RGB): INodeTheme => ({
      fill: dark9,
      stroke,
      radius: 20,
      hoverRadius: 28,
      strokeWidth: 4,
      labelScale: 1.25,
    });
    const fontSizeValue = parseFloat(styles.getPropertyValue("--mantine-font-size-sm"));

    this.theme = {
      nodes: {
        idea: standard(color("--mantine-color-dark-3", [0.64, 0.67, 0.71]), dark4),
        task: standard(
          color("--mantine-color-green-5", [0.25, 0.76, 0.47]),
          color("--mantine-color-green-7", [0.22, 0.58, 0.36])
        ),
        source: standard(
          color("--mantine-color-dark-8", [0.12, 0.13, 0.16]),
          color("--mantine-color-blue-7", [0.11, 0.45, 0.84])
        ),
        excerpt: standard(
          color("--mantine-color-dark-7", [0.16, 0.18, 0.21]),
          color("--mantine-color-blue-5", [0.21, 0.59, 0.95])
        ),
        tag: organizer(color("--mantine-color-red-5", [1, 0.42, 0.42])),
        rabbithole: organizer(color("--mantine-color-yellow-5", [1, 0.83, 0.23])),
        user: standard(dark9, dark4),
      },
      highlightRing: color("--mantine-color-dark-2", [0.78, 0.8, 0.82]),
      focusRing: color("--mantine-color-yellow-5", [1, 0.83, 0.23]),
      edge: color("--mantine-color-dark-5", [0.36, 0.38, 0.42]),
      selectedEdge: dark4,
      unselectedEdge: color("--mantine-color-dark-8", [0.12, 0.13, 0.16]),
      label: styles.getPropertyValue("--mantine-color-dimmed").trim() || "#868e96",
      selectedLabel: styles.getPropertyValue("--mantine-color-dark-1").trim() || "#c1c2c5",
      fontFamily:
        styles.getPropertyValue("--mantine-font-family").trim() || "Inter, system-ui, sans-serif",
      fontSize: Number.isFinite(fontSizeValue) && fontSizeValue > 8 ? fontSizeValue : 14,
    };
    this.lastStyleRevision = undefined;
    this.lastLabelStyleRevision = undefined;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const pixelWidth = Math.max(1, Math.round(width * this.pixelRatio));
    const pixelHeight = Math.max(1, Math.round(height * this.pixelRatio));
    this.canvas.width = pixelWidth;
    this.canvas.height = pixelHeight;
    this.labelCanvas.width = pixelWidth;
    this.labelCanvas.height = pixelHeight;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.labelCanvas.style.width = `${width}px`;
    this.labelCanvas.style.height = `${height}px`;
    this.gl.viewport(0, 0, pixelWidth, pixelHeight);
  }

  draw(state: IRenderState) {
    if (!this.width || !this.height) return false;
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const edgeAnimating = this.drawEdges(state);
    const keepAnimating = this.drawNodes(state);
    this.drawLabels(state);
    return keepAnimating || edgeAnimating;
  }

  private setViewportUniforms(
    resolution: WebGLUniformLocation,
    viewport: WebGLUniformLocation,
    state: IRenderState
  ) {
    this.gl.uniform2f(resolution, this.width, this.height);
    this.gl.uniform3f(viewport, state.viewport.scale, state.viewport.x, state.viewport.y);
  }

  private shouldUploadGeometry(state: IRenderState) {
    return (
      state.positionRevision === undefined ||
      state.styleRevision === undefined ||
      state.nodes !== this.lastNodes ||
      state.edges !== this.lastEdges ||
      state.positionRevision !== this.lastPositionRevision ||
      state.styleRevision !== this.lastStyleRevision ||
      this.getEdgeLodKey(state) !== this.lastEdgeLodKey
    );
  }

  private getEdgeLodKey(state: IRenderState) {
    return Math.min(21, Math.floor(state.viewport.scale * 20));
  }

  private rememberGeometryState(state: IRenderState) {
    this.lastNodes = state.nodes;
    this.lastEdges = state.edges;
    this.lastPositionRevision = state.positionRevision;
    this.lastStyleRevision = state.styleRevision;
    this.lastEdgeLodKey = this.getEdgeLodKey(state);
  }

  private getEdgeRevealRatio(state: IRenderState) {
    if (state.viewport.scale >= 1.05 || state.edges.length === 0) return 1;
    const edgesPerNode = 0.25 + Math.max(0, state.viewport.scale - 0.35) * 1.7;
    return Math.min(1, (state.nodes.length * edgesPerNode) / state.edges.length);
  }

  private getEdgeTypeMultiplier(type: IEdge["type"]) {
    switch (type) {
      case "connection":
        return 1.65;
      case "inclusion":
        return 1.35;
      case "reference":
        return 1.1;
      case "description":
        return 0.8;
      case "share":
        return 0.65;
      default:
        return 1;
    }
  }

  private getInteractionSource(state: IRenderState) {
    return (
      state.hovered ||
      state.focused ||
      state.interactionSource ||
      state.selected.values().next().value ||
      state.highlighted.values().next().value
    );
  }

  private getPathDistances(edges: IEdge[], source: string | undefined) {
    if (this.pathEdges !== edges) {
      const adjacency = new Map<string, string[]>();
      for (const edge of edges) {
        const sourceNeighbors = adjacency.get(edge.source);
        if (sourceNeighbors) sourceNeighbors.push(edge.target);
        else adjacency.set(edge.source, [edge.target]);
        const targetNeighbors = adjacency.get(edge.target);
        if (targetNeighbors) targetNeighbors.push(edge.source);
        else adjacency.set(edge.target, [edge.source]);
      }
      this.pathEdges = edges;
      this.pathAdjacency = adjacency;
      this.pathSource = undefined;
      this.pathDistances = new Map();
    }
    if (this.pathSource === source) return this.pathDistances;

    const distances = new Map<string, number>();
    if (source) {
      const queue = [source];
      distances.set(source, 0);
      for (let index = 0; index < queue.length; index += 1) {
        const nodeId = queue[index];
        const nextDistance = (distances.get(nodeId) || 0) + 1;
        if (nextDistance > MAX_PATH_HOPS) continue;
        for (const neighborId of this.pathAdjacency.get(nodeId) || []) {
          if (distances.has(neighborId)) continue;
          distances.set(neighborId, nextDistance);
          queue.push(neighborId);
        }
      }
    }
    this.pathSource = source;
    this.pathDistances = distances;
    return distances;
  }

  private getPathProminence(edge: IEdge, distances: Map<string, number>) {
    const sourceDistance = distances.get(edge.source);
    const targetDistance = distances.get(edge.target);
    const distance = Math.min(sourceDistance ?? Infinity, targetDistance ?? Infinity);
    if (!Number.isFinite(distance)) return 0.08;
    return 0.08 + 0.92 * Math.exp(-0.78 * distance);
  }

  private getEdgeEffect(
    state: IRenderState,
    edge: IEdge,
    active: boolean,
    interactionSource: string | undefined,
    distances: Map<string, number>
  ) {
    if (!active || !interactionSource) return undefined;
    const sourceDistance = distances.get(edge.source) ?? Infinity;
    const targetDistance = distances.get(edge.target) ?? Infinity;
    if (!Number.isFinite(sourceDistance) && !Number.isFinite(targetDistance)) return undefined;
    const interactionType =
      state.hovered === interactionSource
        ? "hovered"
        : state.focused === interactionSource
          ? "focused"
          : state.selected.has(interactionSource)
            ? "selected"
            : "highlighted";
    return {
      key: `${interactionType}:${interactionSource}`,
      originAtSource: sourceDistance <= targetDistance,
      delay: Math.min(sourceDistance, targetDistance, MAX_PATH_HOPS) * EDGE_PATH_DELAY,
    };
  }

  private updateEdgeTransition(
    id: string,
    targetColor: RGB,
    targetOpacity: number,
    targetWidth: number,
    fallbackColor: RGB,
    fallbackOpacity: number,
    fallbackWidth: number,
    effect: { key: string; originAtSource: boolean; delay: number } | undefined,
    time: number
  ) {
    let transition = this.edgeTransitions.get(id);
    if (!transition) {
      const initialColor: RGB = effect ? [...fallbackColor] : [...targetColor];
      const initialOpacity = effect ? fallbackOpacity : targetOpacity;
      const initialWidth = effect ? fallbackWidth : targetWidth;
      transition = {
        color: initialColor,
        opacity: initialOpacity,
        width: initialWidth,
        startColor: [...initialColor],
        startOpacity: initialOpacity,
        startWidth: initialWidth,
        targetColor: [...targetColor],
        targetOpacity,
        targetWidth,
        startedAt: time,
        effectKey: effect?.key,
        effectOriginAtSource: effect?.originAtSource ?? true,
        effectStartedAt: effect ? time + effect.delay : -Infinity,
        effectStartColor: [...initialColor],
        effectStartOpacity: initialOpacity,
      };
      this.edgeTransitions.set(id, transition);
    }

    const targetChanged =
      transition.targetColor[0] !== targetColor[0] ||
      transition.targetColor[1] !== targetColor[1] ||
      transition.targetColor[2] !== targetColor[2] ||
      transition.targetOpacity !== targetOpacity ||
      transition.targetWidth !== targetWidth;
    if (targetChanged) {
      transition.startColor = [...transition.color];
      transition.startOpacity = transition.opacity;
      transition.startWidth = transition.width;
      transition.targetColor = [...targetColor];
      transition.targetOpacity = targetOpacity;
      transition.targetWidth = targetWidth;
      transition.startedAt = time;
    }

    if (effect && transition.effectKey !== effect.key) {
      transition.effectKey = effect.key;
      transition.effectOriginAtSource = effect.originAtSource;
      transition.effectStartedAt = time + effect.delay;
      transition.effectStartColor = [...transition.color];
      transition.effectStartOpacity = transition.opacity;
    } else if (!effect) {
      transition.effectKey = undefined;
    }

    const progress = Math.min(1, (time - transition.startedAt) / EDGE_TRANSITION_DURATION);
    const eased = 1 - Math.pow(1 - progress, 3);
    transition.color = [
      transition.startColor[0] + (transition.targetColor[0] - transition.startColor[0]) * eased,
      transition.startColor[1] + (transition.targetColor[1] - transition.startColor[1]) * eased,
      transition.startColor[2] + (transition.targetColor[2] - transition.startColor[2]) * eased,
    ];
    transition.opacity =
      transition.startOpacity + (transition.targetOpacity - transition.startOpacity) * eased;
    transition.width =
      transition.startWidth + (transition.targetWidth - transition.startWidth) * eased;

    const effectElapsed = effect ? time - transition.effectStartedAt : EDGE_GLIMMER_DURATION;
    const waveAnimating = effect !== undefined && effectElapsed < EDGE_GLIMMER_DURATION;
    const waveRadius = waveAnimating ? Math.max(0, effectElapsed) * EDGE_GLIMMER_SPEED : -1;
    return {
      color: transition.color,
      opacity: transition.opacity,
      width: transition.width,
      baseColor: waveAnimating ? transition.effectStartColor : transition.color,
      baseOpacity: waveAnimating ? transition.effectStartOpacity : transition.opacity,
      targetColor: waveAnimating ? transition.targetColor : transition.color,
      targetOpacity: waveAnimating ? transition.targetOpacity : transition.opacity,
      waveRadius,
      originAtSource: transition.effectOriginAtSource,
      animating: progress < 1 || waveAnimating,
    };
  }

  private drawEdges(state: IRenderState) {
    const time = state.time ?? performance.now();
    const upload = this.shouldUploadGeometry(state) || this.hasActiveEdgeTransitions;
    let transitionAnimating = false;
    if (upload) {
      const requiredLength = state.edges.length * EDGE_FLOATS * 6;
      if (this.edgeVertices.length < requiredLength) {
        this.edgeVertices = new Float32Array(requiredLength);
      }
      let cursor = 0;
      const liveEdgeIds = new Set<string>();
      const activeNodes = new Set(state.selected);
      for (const id of state.highlighted) activeNodes.add(id);
      if (state.focused) activeNodes.add(state.focused);
      if (state.hovered) activeNodes.add(state.hovered);
      const hasActiveNodes = activeNodes.size > 0;
      const interactionSource = this.getInteractionSource(state);
      const pathDistances = this.getPathDistances(state.edges, interactionSource);
      const revealRatio = this.getEdgeRevealRatio(state);
      for (const edge of state.edges) {
        const source = state.positions.get(edge.source);
        const target = state.positions.get(edge.target);
        if (!source || !target) continue;
        const active = activeNodes.has(edge.source) || activeNodes.has(edge.target);
        const backgroundRatio = hasActiveNodes ? revealRatio * 0.3 : revealRatio;
        const revealThreshold = Math.min(
          1,
          backgroundRatio * this.getEdgeTypeMultiplier(edge.type)
        );
        if (!active && getStableRatio(edge.id) > revealThreshold) continue;
        liveEdgeIds.add(edge.id);

        const subdued = hasActiveNodes && !active;
        const filtered = state.filter
          ? !state.filter(edge.source) || !state.filter(edge.target)
          : false;
        const normalOpacity =
          (edge.visibility === "high" ? 0.48 : edge.visibility === "medium" ? 0.34 : 0.24) *
          (filtered ? 0.25 : 1);
        const pathProminence = active ? this.getPathProminence(edge, pathDistances) : 1;
        const targetOpacity =
          (subdued ? 0.04 : active ? 0.95 * pathProminence : normalOpacity) *
          (active || subdued ? (filtered ? 0.25 : 1) : 1);
        const activeColorWeight = 0.2 + pathProminence * 0.8;
        const activeColor: RGB = [
          this.theme.edge[0] +
            (this.theme.selectedEdge[0] - this.theme.edge[0]) * activeColorWeight,
          this.theme.edge[1] +
            (this.theme.selectedEdge[1] - this.theme.edge[1]) * activeColorWeight,
          this.theme.edge[2] +
            (this.theme.selectedEdge[2] - this.theme.edge[2]) * activeColorWeight,
        ];
        const targetColor = subdued
          ? this.theme.unselectedEdge
          : active
            ? activeColor
            : this.theme.edge;
        const targetWidth = active
          ? 1.2 + pathProminence * 1.8
          : edge.visibility === "high"
            ? 1.8
            : 1.4;
        const transition = this.updateEdgeTransition(
          edge.id,
          targetColor,
          targetOpacity,
          targetWidth,
          this.theme.edge,
          normalOpacity,
          edge.visibility === "high" ? 1.8 : 1.4,
          this.getEdgeEffect(state, edge, active, interactionSource, pathDistances),
          time
        );
        transitionAnimating ||= transition.animating;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.hypot(dx, dy) || 1;
        const normalX = (-dy / length) * (transition.width / 2);
        const normalY = (dx / length) * (transition.width / 2);
        for (let vertex = 0; vertex < 6; vertex += 1) {
          const along = EDGE_VERTEX_ALONG[vertex];
          const side = EDGE_VERTEX_SIDE[vertex];
          this.edgeVertices[cursor] = (along ? target.x : source.x) + normalX * side;
          this.edgeVertices[cursor + 1] = (along ? target.y : source.y) + normalY * side;
          this.edgeVertices[cursor + 2] = transition.baseColor[0];
          this.edgeVertices[cursor + 3] = transition.baseColor[1];
          this.edgeVertices[cursor + 4] = transition.baseColor[2];
          this.edgeVertices[cursor + 5] = transition.baseOpacity;
          this.edgeVertices[cursor + 6] = transition.targetColor[0];
          this.edgeVertices[cursor + 7] = transition.targetColor[1];
          this.edgeVertices[cursor + 8] = transition.targetColor[2];
          this.edgeVertices[cursor + 9] = transition.targetOpacity;
          this.edgeVertices[cursor + 10] = (transition.originAtSource ? along : 1 - along) * length;
          this.edgeVertices[cursor + 11] = transition.waveRadius;
          cursor += EDGE_FLOATS;
        }
      }
      for (const id of this.edgeTransitions.keys()) {
        if (!liveEdgeIds.has(id)) this.edgeTransitions.delete(id);
      }
      this.edgeVertexCount = cursor / EDGE_FLOATS;
      this.hasActiveEdgeTransitions = transitionAnimating;
    }

    const gl = this.gl;
    gl.useProgram(this.edgeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
    if (upload) {
      gl.bufferData(
        gl.ARRAY_BUFFER,
        this.edgeVertices.subarray(0, this.edgeVertexCount * EDGE_FLOATS),
        gl.DYNAMIC_DRAW
      );
    }
    const stride = EDGE_FLOATS * Float32Array.BYTES_PER_ELEMENT;
    const {
      position: positionLocation,
      color: colorLocation,
      targetColor: targetColorLocation,
      effect: effectLocation,
    } = this.edgeLocations;
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(colorLocation);
    gl.vertexAttribPointer(
      colorLocation,
      4,
      gl.FLOAT,
      false,
      stride,
      2 * Float32Array.BYTES_PER_ELEMENT
    );
    gl.enableVertexAttribArray(targetColorLocation);
    gl.vertexAttribPointer(
      targetColorLocation,
      4,
      gl.FLOAT,
      false,
      stride,
      6 * Float32Array.BYTES_PER_ELEMENT
    );
    gl.enableVertexAttribArray(effectLocation);
    gl.vertexAttribPointer(
      effectLocation,
      2,
      gl.FLOAT,
      false,
      stride,
      10 * Float32Array.BYTES_PER_ELEMENT
    );
    this.setViewportUniforms(this.edgeLocations.resolution, this.edgeLocations.viewport, state);
    gl.drawArrays(gl.TRIANGLES, 0, this.edgeVertexCount);
    return transitionAnimating;
  }

  private getNodeOpacity(state: IRenderState, id: string) {
    const selected = state.selected.has(id);
    if (selected) return 1;
    if (state.highlighted.size > 0 && !state.highlighted.has(id)) return 0.5;
    if (state.selected.size > 0) return 0.25;
    return 1;
  }

  private updateTransition(id: string, radius: number, opacity: number, time: number) {
    const transition = this.nodeTransitions.get(id);
    if (!transition) {
      this.nodeTransitions.set(id, {
        radius,
        opacity,
        startRadius: radius,
        startOpacity: opacity,
        targetRadius: radius,
        targetOpacity: opacity,
        startedAt: time,
      });
      return { radius, opacity, animating: false };
    }

    if (transition.targetRadius !== radius || transition.targetOpacity !== opacity) {
      transition.startRadius = transition.radius;
      transition.startOpacity = transition.opacity;
      transition.targetRadius = radius;
      transition.targetOpacity = opacity;
      transition.startedAt = time;
    }

    const progress = Math.min(1, (time - transition.startedAt) / TRANSITION_DURATION);
    const eased = 1 - Math.pow(1 - progress, 3);
    transition.radius =
      transition.startRadius + (transition.targetRadius - transition.startRadius) * eased;
    transition.opacity =
      transition.startOpacity + (transition.targetOpacity - transition.startOpacity) * eased;
    const animating = progress < 1;
    return { radius: transition.radius, opacity: transition.opacity, animating };
  }

  private drawNodes(state: IRenderState) {
    const time = state.time ?? performance.now();
    let keepAnimating = !!state.loading;
    let transitionAnimating = false;
    const upload = this.shouldUploadGeometry(state) || state.loading || this.hasActiveTransitions;
    if (upload) {
      const requiredLength = state.nodes.length * NODE_FLOATS;
      if (this.nodeVertices.length < requiredLength) {
        this.nodeVertices = new Float32Array(requiredLength);
      }
      let cursor = 0;
      const liveNodeIds = new Set<string>();
      for (const node of state.nodes) {
        const id = node.id.toString();
        const position = state.positions.get(id);
        if (!position) continue;
        liveNodeIds.add(id);
        const theme = this.theme.nodes[node.type];
        const filtered = state.filter ? !state.filter(id, node) : false;
        const groupOpacity = filtered ? 0.25 : 1;
        const targetRadius = state.hovered === id ? theme.hoverRadius : theme.radius;
        const targetOpacity = this.getNodeOpacity(state, id);
        const transition = this.updateTransition(id, targetRadius, targetOpacity, time);
        keepAnimating ||= transition.animating;
        transitionAnimating ||= transition.animating;
        const loadingPulse = state.loading
          ? 0.75 + Math.cos(((time + getStringPhase(id)) / 1000) * Math.PI * 2) * 0.25
          : 1;
        const circleOpacity = transition.opacity * groupOpacity * loadingPulse;
        const highlighted = state.highlighted.has(id);
        const ring = state.focused === id ? this.theme.focusRing : this.theme.highlightRing;

        this.nodeVertices[cursor] = position.x;
        this.nodeVertices[cursor + 1] = position.y;
        this.nodeVertices[cursor + 2] = theme.fill[0];
        this.nodeVertices[cursor + 3] = theme.fill[1];
        this.nodeVertices[cursor + 4] = theme.fill[2];
        this.nodeVertices[cursor + 5] = circleOpacity;
        this.nodeVertices[cursor + 6] = theme.stroke[0];
        this.nodeVertices[cursor + 7] = theme.stroke[1];
        this.nodeVertices[cursor + 8] = theme.stroke[2];
        this.nodeVertices[cursor + 9] = circleOpacity;
        this.nodeVertices[cursor + 10] = ring[0];
        this.nodeVertices[cursor + 11] = ring[1];
        this.nodeVertices[cursor + 12] = ring[2];
        this.nodeVertices[cursor + 13] = highlighted ? groupOpacity : 0;
        this.nodeVertices[cursor + 14] = transition.radius;
        this.nodeVertices[cursor + 15] = theme.strokeWidth;
        this.nodeVertices[cursor + 16] = highlighted ? 30 : 0;
        this.nodeVertices[cursor + 17] = highlighted ? 2 : 0;
        cursor += NODE_FLOATS;
      }
      for (const id of this.nodeTransitions.keys()) {
        if (!liveNodeIds.has(id)) this.nodeTransitions.delete(id);
      }
      this.nodeVertexCount = cursor / NODE_FLOATS;
      this.hasActiveTransitions = transitionAnimating;
    }

    const gl = this.gl;
    gl.useProgram(this.nodeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
    if (upload) {
      gl.bufferData(
        gl.ARRAY_BUFFER,
        this.nodeVertices.subarray(0, this.nodeVertexCount * NODE_FLOATS),
        gl.DYNAMIC_DRAW
      );
    }
    const stride = NODE_FLOATS * Float32Array.BYTES_PER_ELEMENT;
    const { position, fill, stroke, ring, metrics } = this.nodeLocations;
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(fill);
    gl.vertexAttribPointer(fill, 4, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(stroke);
    gl.vertexAttribPointer(stroke, 4, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(ring);
    gl.vertexAttribPointer(ring, 4, gl.FLOAT, false, stride, 10 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(metrics);
    gl.vertexAttribPointer(
      metrics,
      4,
      gl.FLOAT,
      false,
      stride,
      14 * Float32Array.BYTES_PER_ELEMENT
    );
    this.setViewportUniforms(this.nodeLocations.resolution, this.nodeLocations.viewport, state);
    gl.uniform1f(this.nodeLocations.pixelRatio, this.pixelRatio);
    gl.drawArrays(gl.POINTS, 0, this.nodeVertexCount);
    if (upload) this.rememberGeometryState(state);
    return keepAnimating;
  }

  private drawLabels(state: IRenderState) {
    const context = this.labelContext;
    context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    if (state.viewport.scale <= 0.45) return;

    const occupied = new Set<string>();
    if (
      state.nodes !== this.lastLabelNodes ||
      state.styleRevision === undefined ||
      state.styleRevision !== this.lastLabelStyleRevision ||
      this.labelPriorityNodes.length === 0
    ) {
      this.labelPriorityNodes = [...state.nodes].sort((left, right) => {
        const leftId = left.id.toString();
        const rightId = right.id.toString();
        const leftPriority =
          Number(state.selected.has(leftId)) * 2 + Number(state.highlighted.has(leftId));
        const rightPriority =
          Number(state.selected.has(rightId)) * 2 + Number(state.highlighted.has(rightId));
        return rightPriority - leftPriority;
      });
      this.lastLabelNodes = state.nodes;
      this.lastLabelStyleRevision = state.styleRevision;
    }

    context.textAlign = "center";
    context.textBaseline = "top";
    const maxLabels = Math.min(state.nodes.length, 250);
    const zoomOpacity = Math.min(1, (state.viewport.scale - 0.45) / 0.08);
    let rendered = 0;
    for (const node of this.labelPriorityNodes) {
      if (rendered >= maxLabels) break;
      const id = node.id.toString();
      const selected = state.selected.has(id);
      const highlighted = state.highlighted.has(id);
      if (state.selected.size > 0 && !selected && !highlighted) continue;
      const position = state.positions.get(id);
      if (!position) continue;
      const nodeTheme = this.theme.nodes[node.type];
      const x = position.x * state.viewport.scale + state.viewport.x;
      const y =
        position.y * state.viewport.scale +
        state.viewport.y +
        (nodeTheme.radius + 8) * state.viewport.scale;
      if (x < -100 || y < -30 || x > this.width + 100 || y > this.height + 30) continue;

      const title = getNodeTitle(node);
      if (!title) continue;
      const fontSize = this.theme.fontSize * nodeTheme.labelScale * state.viewport.scale;
      if (fontSize < 5) continue;
      context.font = `500 ${fontSize}px ${this.theme.fontFamily}`;
      const maxLabelWidth = 180 * state.viewport.scale;
      const lines = wrapLabel(context, title, maxLabelWidth);
      if (lines.length === 0) continue;
      const lineHeight = fontSize * 1.25;
      const labelWidth = Math.max(...lines.map((line) => context.measureText(line).width)) + 12;
      // Resolve collisions in graph space. Screen-space buckets changed as the
      // viewport crossed arbitrary pixel boundaries, making labels flicker
      // even though their positions relative to one another had not changed.
      const labelY = position.y + nodeTheme.radius + 8;
      const labelWidthInGraph = labelWidth / state.viewport.scale;
      const lineHeightInGraph = lineHeight / state.viewport.scale;
      const minCellX = Math.floor((position.x - labelWidthInGraph / 2) / 48);
      const maxCellX = Math.floor((position.x + labelWidthInGraph / 2) / 48);
      const minCellY = Math.floor(labelY / 22);
      const maxCellY = Math.floor((labelY + lineHeightInGraph * lines.length + 4) / 22);
      const isPriority = selected || highlighted;
      let overlaps = false;
      for (let cellX = minCellX; cellX <= maxCellX && !overlaps; cellX += 1) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
          if (occupied.has(`${cellX}:${cellY}`)) {
            overlaps = true;
            break;
          }
        }
      }
      if (!isPriority && overlaps) continue;
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
          occupied.add(`${cellX}:${cellY}`);
        }
      }

      const filtered = state.filter ? !state.filter(id, node) : false;
      const selectionOpacity = state.selected.size > 0 && !selected ? 0.5 : 1;
      context.globalAlpha = zoomOpacity * selectionOpacity * (filtered ? 0.25 : 1);
      context.fillStyle = selected ? this.theme.selectedLabel : this.theme.label;
      for (let line = 0; line < lines.length; line += 1) {
        context.fillText(lines[line], x, y + line * lineHeight);
      }
      rendered += 1;
    }
    context.globalAlpha = 1;
  }

  destroy() {
    const gl = this.gl;
    gl.deleteBuffer(this.nodeBuffer);
    gl.deleteBuffer(this.edgeBuffer);
    gl.deleteProgram(this.nodeProgram);
    gl.deleteProgram(this.edgeProgram);
    this.nodeTransitions.clear();
    this.edgeTransitions.clear();
  }
}

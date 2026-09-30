import React from "react";
import styles from "./AntLoader.module.scss";
import { Text } from "@mantine/core";
import { useSettings } from "@/contexts/SettingsContext";

type Direction = 0 | 1 | 2 | 3;
type RgbColor = [number, number, number];

const colorsAreEqual = (colorA: RgbColor, colorB: RgbColor): boolean => {
  return colorA[0] === colorB[0] && colorA[1] === colorB[1] && colorA[2] === colorB[2];
};

const rgbToString = (rgb: RgbColor): string => `rgb(${rgb.join(",")})`;

const parseThemeColor = (value: string | undefined, fallback: RgbColor): RgbColor => {
  const color = value?.trim();
  if (!color) return fallback;

  const shortHex = color.match(/^#([\da-f])([\da-f])([\da-f])$/i);
  if (shortHex) {
    return shortHex.slice(1).map((component) => parseInt(component + component, 16)) as RgbColor;
  }

  const hex = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})(?:[\da-f]{2})?$/i);
  if (hex) return hex.slice(1, 4).map((component) => parseInt(component, 16)) as RgbColor;

  const rgb = color.match(
    /^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)/i
  );
  if (rgb) {
    return rgb.slice(1, 4).map((component) => Math.min(255, Number(component))) as RgbColor;
  }

  return fallback;
};

interface CellData {
  targetColorRgb: RgbColor;
  fromColorRgb: RgbColor;
  transitionStart: number;
  lastVisitedTimestamp: number;
  isAging?: boolean;
}

interface AntState {
  x: number;
  y: number;
  dir: Direction;
}

interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface LangtonsAntLoaderProps {
  stepsPerSecond?: number;
  cellSize?: number;
  fadeDuration?: number;
  numAnts?: number;
  randomTurnProbability?: number;
  cellAgeThreshold?: number;
  cellAgeFadeDuration?: number;
  modeSwitchInterval?: number;
  gravityStrength?: number;
  onStepUpdate?: (steps: number) => void;
  loadingText?: string; // This prop is already defined
  withOverlay?: boolean;
}

const LangtonsAntLoader: React.FC<LangtonsAntLoaderProps> = ({
  stepsPerSecond = 5,
  cellSize = 25,
  fadeDuration = 400,
  numAnts = 8,
  randomTurnProbability = 0.03,
  cellAgeThreshold = 8000,
  cellAgeFadeDuration = 4000,
  modeSwitchInterval = 5000,
  gravityStrength = 0.1,
  onStepUpdate,
  loadingText, // Destructure the new prop
  withOverlay,
}) => {
  const {
    ui: {
      theme: {
        resolved: { get: resolvedTheme },
      },
    },
  } = useSettings();
  const [backgroundColor, foregroundColor] = React.useMemo(() => {
    const variables = resolvedTheme.applicator.variables;
    return [
      parseThemeColor(variables["--mantine-color-default"], [29, 32, 33]),
      parseThemeColor(
        variables["--theme-accent"] ??
          variables["--color-highlight"] ??
          variables["--mantine-color-text"],
        [152, 151, 26]
      ),
    ] as const;
  }, [resolvedTheme]);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const grid = React.useRef<Map<string, CellData>>(new Map());
  const ants = React.useRef<AntState[]>([]);
  const animationFrameId = React.useRef<number | null>(null);
  const lastStepTime = React.useRef<number>(0);
  const stepInterval = React.useRef<number>(1000 / stepsPerSecond);
  const currentTimestamp = React.useRef<number>(0);
  const totalSteps = React.useRef<number>(0);
  const stepsUntilModeSwitch = React.useRef<number>(modeSwitchInterval);
  const gravityMode = React.useRef<boolean>(true);
  const lastReportedSteps = React.useRef<number>(0);
  const gridBounds = React.useRef<GridBounds>({
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  });

  React.useEffect(() => {
    stepInterval.current = 1000 / stepsPerSecond;
  }, [stepsPerSecond]);

  React.useEffect(() => {
    stepsUntilModeSwitch.current = modeSwitchInterval;
  }, [modeSwitchInterval]);

  const interpolateColor = (startRgb: RgbColor, endRgb: RgbColor, progress: number): string => {
    const p = Math.max(0, Math.min(1, progress));
    const r = Math.round(startRgb[0] + (endRgb[0] - startRgb[0]) * p);
    const g = Math.round(startRgb[1] + (endRgb[1] - startRgb[1]) * p);
    const b = Math.round(startRgb[2] + (endRgb[2] - startRgb[2]) * p);
    return rgbToString([r, g, b]);
  };

  const getCellData = React.useCallback(
    (x: number, y: number): CellData =>
      grid.current.get(`${x},${y}`) ?? {
        targetColorRgb: backgroundColor,
        fromColorRgb: backgroundColor,
        transitionStart: -1,
        lastVisitedTimestamp: 0,
        isAging: false,
      },
    [backgroundColor]
  );

  const getCurrentVisualColor = React.useCallback(
    (data: CellData, timestamp: number): RgbColor => {
      if (data.transitionStart === -1 || colorsAreEqual(data.fromColorRgb, data.targetColorRgb)) {
        return data.targetColorRgb;
      }
      const currentFadeDuration = data.isAging ? cellAgeFadeDuration : fadeDuration;
      const elapsed = timestamp - data.transitionStart;
      const progress = Math.min(1, elapsed / currentFadeDuration);
      const r = Math.round(
        data.fromColorRgb[0] + (data.targetColorRgb[0] - data.fromColorRgb[0]) * progress
      );
      const g = Math.round(
        data.fromColorRgb[1] + (data.targetColorRgb[1] - data.fromColorRgb[1]) * progress
      );
      const b = Math.round(
        data.fromColorRgb[2] + (data.targetColorRgb[2] - data.fromColorRgb[2]) * progress
      );
      return [r, g, b];
    },
    [cellAgeFadeDuration, fadeDuration]
  );

  const setCellState = React.useCallback(
    (
      x: number,
      y: number,
      newTargetColor: RgbColor,
      currentVisualColor: RgbColor,
      timestamp: number,
      isAgingTransition: boolean = false
    ): void => {
      const key = `${x},${y}`;
      const existingData = grid.current.get(key);
      if (
        existingData &&
        existingData.transitionStart !== -1 &&
        !existingData.isAging &&
        isAgingTransition
      )
        return;

      if (
        !existingData ||
        !colorsAreEqual(existingData.targetColorRgb, newTargetColor) ||
        existingData.transitionStart === -1
      ) {
        grid.current.set(key, {
          targetColorRgb: newTargetColor,
          fromColorRgb: currentVisualColor,
          transitionStart: timestamp,
          lastVisitedTimestamp: isAgingTransition
            ? existingData?.lastVisitedTimestamp || 0
            : timestamp,
          isAging: isAgingTransition,
        });
      } else if (!isAgingTransition && existingData) {
        existingData.lastVisitedTimestamp = timestamp;
        if (existingData.isAging) {
          grid.current.set(key, {
            targetColorRgb: newTargetColor,
            fromColorRgb: currentVisualColor,
            transitionStart: timestamp,
            lastVisitedTimestamp: timestamp,
            isAging: false,
          });
        }
      }
    },
    []
  );

  const draw = React.useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const offsetX = canvas.width / 2;
      const offsetY = canvas.height / 2;

      grid.current.forEach((data, key) => {
        const [xStr, yStr] = key.split(",");
        const x = parseInt(xStr, 10);
        const y = parseInt(yStr, 10);
        const drawX = offsetX + x * cellSize;
        const drawY = offsetY + y * cellSize;

        if (
          drawX + cellSize > 0 &&
          drawX < canvas.width &&
          drawY + cellSize > 0 &&
          drawY < canvas.height
        ) {
          let colorStr: string;
          const currentFadeDuration = data.isAging ? cellAgeFadeDuration : fadeDuration;
          if (data.transitionStart === -1) {
            colorStr = rgbToString(data.targetColorRgb);
          } else {
            const elapsed = timestamp - data.transitionStart;
            const progress = Math.min(1, elapsed / currentFadeDuration);
            colorStr = interpolateColor(data.fromColorRgb, data.targetColorRgb, progress);
            if (progress >= 1) {
              data.fromColorRgb = data.targetColorRgb;
              data.transitionStart = -1;
              data.isAging = false;
            }
          }
          ctx.fillStyle = colorStr;
          ctx.fillRect(drawX, drawY, cellSize, cellSize);
        }
      });
    },
    [cellSize, fadeDuration, cellAgeFadeDuration]
  );

  const getBiasedDirections = (ant: AntState, attract: boolean): Direction[] => {
    const biasedDirs: Direction[] = [];
    const { x, y } = ant;
    if (attract) {
      if (x > 0) biasedDirs.push(3);
      if (x < 0) biasedDirs.push(1);
      if (y > 0) biasedDirs.push(0);
      if (y < 0) biasedDirs.push(2);
    } else {
      if (x >= 0) biasedDirs.push(1);
      if (x <= 0) biasedDirs.push(3);
      if (y >= 0) biasedDirs.push(2);
      if (y <= 0) biasedDirs.push(0);
    }
    if (x === 0 && y === 0) return attract ? [] : [0, 1, 2, 3];
    return biasedDirs;
  };

  const updateAnts = React.useCallback(
    (timestamp: number) => {
      stepsUntilModeSwitch.current -= ants.current.length;
      if (stepsUntilModeSwitch.current <= 0) {
        gravityMode.current = !gravityMode.current;
        stepsUntilModeSwitch.current = modeSwitchInterval;
      }

      ants.current.forEach((ant) => {
        totalSteps.current++;
        const { x, y } = ant;
        const currentCellData = getCellData(x, y);
        const isBackground = colorsAreEqual(currentCellData.targetColorRgb, backgroundColor);
        const currentVisualColor = getCurrentVisualColor(currentCellData, timestamp);
        let nextTargetColor: RgbColor;
        let intendedDir = ant.dir;

        if (Math.random() < randomTurnProbability) {
          const randomChoice = Math.random();
          if (randomChoice < 0.4) intendedDir = ((ant.dir + 3) % 4) as Direction;
          else if (randomChoice < 0.8) intendedDir = ((ant.dir + 1) % 4) as Direction;
          else intendedDir = ((ant.dir + 2) % 4) as Direction;
          nextTargetColor = isBackground ? foregroundColor : backgroundColor;
        } else {
          if (isBackground) {
            intendedDir = ((ant.dir + 1) % 4) as Direction;
            nextTargetColor = foregroundColor;
          } else {
            intendedDir = ((ant.dir + 3) % 4) as Direction;
            nextTargetColor = backgroundColor;
          }
        }

        let finalDir = intendedDir;
        if (Math.random() < gravityStrength) {
          const biasedDirections = getBiasedDirections(ant, gravityMode.current);
          if (biasedDirections.length > 0) {
            const isAlreadyBiased = biasedDirections.includes(intendedDir);
            if (!isAlreadyBiased) {
              finalDir = biasedDirections[Math.floor(Math.random() * biasedDirections.length)];
            }
          }
        }
        ant.dir = finalDir;

        setCellState(x, y, nextTargetColor, currentVisualColor, timestamp, false);

        let nextX = x;
        let nextY = y;
        switch (ant.dir) {
          case 0:
            nextY -= 1;
            break;
          case 1:
            nextX += 1;
            break;
          case 2:
            nextY += 1;
            break;
          case 3:
            nextX -= 1;
            break;
        }

        const { minX, maxX, minY, maxY } = gridBounds.current;
        if (nextX < minX || nextX > maxX || nextY < minY || nextY > maxY) {
          ant.dir =
            Math.random() < 0.5
              ? (((ant.dir + 1) % 4) as Direction)
              : (((ant.dir + 3) % 4) as Direction);
        } else {
          ant.x = nextX;
          ant.y = nextY;
        }
      });

      if (onStepUpdate && totalSteps.current - lastReportedSteps.current >= 50) {
        onStepUpdate(totalSteps.current);
        lastReportedSteps.current = totalSteps.current;
      }
    },
    [
      randomTurnProbability,
      gravityStrength,
      modeSwitchInterval,
      onStepUpdate,
      backgroundColor,
      foregroundColor,
      getCellData,
      getCurrentVisualColor,
      setCellState,
    ]
  );

  const ageCells = React.useCallback(
    (timestamp: number) => {
      grid.current.forEach((data, key) => {
        if (
          data.transitionStart === -1 &&
          !colorsAreEqual(data.targetColorRgb, backgroundColor) &&
          timestamp - data.lastVisitedTimestamp > cellAgeThreshold
        ) {
          const [xStr, yStr] = key.split(",");
          setCellState(
            parseInt(xStr, 10),
            parseInt(yStr, 10),
            backgroundColor,
            data.targetColorRgb,
            timestamp,
            true
          );
        }
      });
    },
    [backgroundColor, cellAgeThreshold, setCellState]
  );

  const runSimulation = React.useCallback(
    (timestamp: number) => {
      currentTimestamp.current = timestamp;
      if (!lastStepTime.current) lastStepTime.current = timestamp;
      const deltaStepTime = timestamp - lastStepTime.current;

      if (deltaStepTime >= stepInterval.current) {
        updateAnts(timestamp);
        ageCells(timestamp);
        lastStepTime.current = timestamp - (deltaStepTime % stepInterval.current);
      }

      draw(timestamp);
      animationFrameId.current = requestAnimationFrame(runSimulation);
    },
    [updateAnts, draw, ageCells]
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const calculateBounds = (width: number, height: number) => {
      const offsetX = width / 2;
      const offsetY = height / 2;
      const halfWidthCells = Math.floor(offsetX / cellSize);
      const halfHeightCells = Math.floor(offsetY / cellSize);
      gridBounds.current = {
        minX: -halfWidthCells + 1,
        maxX: halfWidthCells - 1,
        minY: -halfHeightCells + 1,
        maxY: halfHeightCells - 1,
      };
    };

    ants.current = [];
    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 1 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: -2, y: 0 },
      { x: 0, y: -2 },
    ];
    for (let i = 0; i < numAnts; i++) {
      const offset = offsets[i % offsets.length];
      ants.current.push({
        x: offset.x,
        y: offset.y,
        dir: (i % 4) as Direction,
      });
    }
    grid.current.clear();
    totalSteps.current = 0;
    lastReportedSteps.current = 0;
    stepsUntilModeSwitch.current = modeSwitchInterval;
    gravityMode.current = true;
    lastStepTime.current = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width !== canvas.width || height !== canvas.height) {
          canvas.width = width;
          canvas.height = height;
          calculateBounds(width, height);
          draw(currentTimestamp.current);
        }
      }
    });

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    calculateBounds(rect.width, rect.height);
    resizeObserver.observe(container);

    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    requestAnimationFrame((initTimestamp) => {
      currentTimestamp.current = initTimestamp;
      lastStepTime.current = initTimestamp;
      animationFrameId.current = requestAnimationFrame(runSimulation);
    });

    return () => {
      resizeObserver.disconnect();
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [
    runSimulation,
    draw,
    cellSize,
    stepsPerSecond,
    fadeDuration,
    numAnts,
    randomTurnProbability,
    cellAgeThreshold,
    cellAgeFadeDuration,
    modeSwitchInterval,
    gravityStrength,
  ]);

  return (
    <div ref={containerRef} className={styles["langtons-ant-loader-container"]}>
      <div className={styles["loader-overlay"]}></div>
      <canvas ref={canvasRef} className={styles["loader-canvas"]} />
      {/* Conditionally render loading text */}
      {loadingText && (
        <div className={styles["loader-text"]}>
          <Text size="xl">{loadingText}</Text>
        </div>
      )}
      {withOverlay && <div className={styles["blur-overlay"]} />}
    </div>
  );
};

export default LangtonsAntLoader;

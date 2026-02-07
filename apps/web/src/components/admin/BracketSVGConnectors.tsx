/**
 * SVG-based bracket connectors overlay.
 * Draws all connection lines between matches using absolute coordinates.
 */

// Layout constants (must match BracketEditor)
const LANE_HEIGHT = 560;
const LANE_GAP = 80;
const COLUMN_WIDTH = 256; // w-64
const COLUMN_GAP = 24; // gap-6
const LOWER_LANE_OFFSET = 18; // pt-4 (16px) + border-t-2 (2px) on lower lane container

// Center positions for matches within a lane (relative to lane top)
const CENTERS_4 = [70, 210, 350, 490]; // 4 matches per round
const CENTERS_2 = [140, 420]; // 2 matches per round
const CENTERS_1 = [280]; // 1 match per round

interface MatchLike {
  id: number;
  displayOrder?: number | null;
}

interface BracketSVGConnectorsProps {
  upperBracket: Record<number, MatchLike[]>;
  lowerBracket: Record<number, MatchLike[]>;
  grandFinal: MatchLike[];
  width: number;
  height: number;
}

/**
 * Calculates the X position for a column
 */
function getColumnX(colIndex: number): number {
  return colIndex * (COLUMN_WIDTH + COLUMN_GAP);
}

/**
 * Draws an H-V-H path (horizontal-vertical-horizontal) between two points
 */
function createHVHPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
}

export function BracketSVGConnectors({
  upperBracket,
  lowerBracket,
  grandFinal,
  width,
  height,
}: BracketSVGConnectorsProps) {
  const paths: string[] = [];
  const STROKE_WIDTH = 2;

  // Helper to get Y center for a match based on round count and order
  const getMatchY = (
    isLower: boolean,
    numInRound: number,
    order: number, // 1-indexed
  ): number => {
    const centers =
      numInRound >= 4 ? CENTERS_4 : numInRound >= 2 ? CENTERS_2 : CENTERS_1;
    const idx = Math.min(order - 1, centers.length - 1);
    const yInLane = centers[idx] ?? 280;
    // Lower lane has additional offset from pt-4 and border-t-2
    return isLower
      ? LANE_HEIGHT + LANE_GAP + LOWER_LANE_OFFSET + yInLane
      : yInLane;
  };

  // Helper to get column X (right edge of match for outgoing connector)
  const getMatchRightX = (colIndex: number): number => {
    return getColumnX(colIndex) + COLUMN_WIDTH;
  };

  // Helper to get column X (left edge of match for incoming connector)
  const getMatchLeftX = (colIndex: number): number => {
    return getColumnX(colIndex);
  };

  // === UPPER BRACKET CONNECTIONS ===
  // Column mapping: 0->R0, 1->R1, 2->Bridge(empty), 3->R2(Final)

  // R0 (4 matches) → R1 (2 matches): pairs 1-2 merge, 3-4 merge
  const ubR0 = upperBracket[0] || [];
  const ubR1 = upperBracket[1] || [];
  const ubR2 = upperBracket[2] || [];

  if (ubR0.length > 0 && ubR1.length > 0) {
    // Match 1,2 → Semi 1
    for (let i = 0; i < Math.min(ubR0.length, 4); i++) {
      const match = ubR0[i];
      const order = match.displayOrder ?? i + 1;
      const destOrder = order <= 2 ? 1 : 2;
      const x1 = getMatchRightX(0);
      const y1 = getMatchY(false, 4, order);
      const x2 = getMatchLeftX(1);
      const y2 = getMatchY(false, 2, destOrder);
      paths.push(createHVHPath(x1, y1, x2, y2));
    }
  }

  // R1 (2 matches) → R2 (1 match): Semi-Finals to Final
  // Note: Column 2 is bridge, so R2 is actually in column 3
  if (ubR1.length > 0 && ubR2.length > 0) {
    for (let i = 0; i < Math.min(ubR1.length, 2); i++) {
      const match = ubR1[i];
      const order = match.displayOrder ?? i + 1;
      const x1 = getMatchRightX(1);
      const y1 = getMatchY(false, 2, order);
      // Bridge column 2 is empty, final is at column 3
      const x2 = getMatchLeftX(3);
      const y2 = getMatchY(false, 1, 1);
      paths.push(createHVHPath(x1, y1, x2, y2));
    }
  }

  // === LOWER BRACKET CONNECTIONS ===
  // Lower bracket has 4 columns: R0, R1, R2, R3
  const lbR0 = lowerBracket[0] || [];
  const lbR1 = lowerBracket[1] || [];
  const lbR2 = lowerBracket[2] || [];
  const lbR3 = lowerBracket[3] || [];

  // LB R0 (2 matches) → LB R1 (2 matches): straight connections
  if (lbR0.length > 0 && lbR1.length > 0) {
    for (let i = 0; i < Math.min(lbR0.length, 2); i++) {
      const match = lbR0[i];
      const order = match.displayOrder ?? i + 1;
      const x1 = getMatchRightX(0);
      const y1 = getMatchY(true, 2, order);
      const x2 = getMatchLeftX(1);
      const y2 = getMatchY(true, 2, order);
      paths.push(createHVHPath(x1, y1, x2, y2));
    }
  }

  // LB R1 (2 matches) → LB R2 (1 match): 2-to-1 merge
  if (lbR1.length > 0 && lbR2.length > 0) {
    for (let i = 0; i < Math.min(lbR1.length, 2); i++) {
      const match = lbR1[i];
      const order = match.displayOrder ?? i + 1;
      const x1 = getMatchRightX(1);
      const y1 = getMatchY(true, 2, order);
      const x2 = getMatchLeftX(2);
      const y2 = getMatchY(true, 1, 1);
      paths.push(createHVHPath(x1, y1, x2, y2));
    }
  }

  // LB R2 (1 match) → LB R3 (1 match): straight connection
  if (lbR2.length > 0 && lbR3.length > 0) {
    const x1 = getMatchRightX(2);
    const y1 = getMatchY(true, 1, 1);
    const x2 = getMatchLeftX(3);
    const y2 = getMatchY(true, 1, 1);
    paths.push(createHVHPath(x1, y1, x2, y2));
  }

  // === FINALS TO GRAND FINAL ===
  // UB Final (column 3, upper lane) → Grand Final
  // LB Final (column 3, lower lane) → Grand Final
  // Grand Final is at column 4 (after the lanes), centered between lanes
  const gfX = getMatchLeftX(4);
  const gfY = LANE_HEIGHT + LANE_GAP / 2; // Center between lanes

  if (ubR2.length > 0 && grandFinal.length > 0) {
    const x1 = getMatchRightX(3);
    const y1 = getMatchY(false, 1, 1);
    paths.push(createHVHPath(x1, y1, gfX, gfY));
  }

  if (lbR3.length > 0 && grandFinal.length > 0) {
    const x1 = getMatchRightX(3);
    const y1 = getMatchY(true, 1, 1);
    paths.push(createHVHPath(x1, y1, gfX, gfY));
  }

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="black"
          strokeWidth={STROKE_WIDTH}
        />
      ))}
    </svg>
  );
}

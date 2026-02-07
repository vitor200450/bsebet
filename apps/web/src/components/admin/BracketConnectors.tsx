export type ConnectorType =
  | "straight"
  | "fork_top"
  | "fork_bottom"
  | "single_line";

interface BracketConnectorProps {
  type: ConnectorType;
  height?: number; // Height to span for forks (e.g., 70, 140)
  width?: number; // Horizontal stalk width (default 12)
  showMedian?: boolean; // Whether to show the medial bridge line (for forks)
  medianWidth?: number; // Width of the median bridge
  className?: string; // Positioning classes from parent
}

/**
 * BracketConnector renders the visual lines connecting matches in a bracket.
 *
 * POSITIONING: The parent is responsible for positioning via `className`.
 * This component only draws the shape relative to its anchor point.
 *
 * For outgoing connectors (right side of match):
 *   Parent uses: className="right-0 top-1/2 translate-x-full"
 *   This places the connector's left edge at the right edge of the match,
 *   vertically centered.
 *
 * For incoming connectors (left side of match):
 *   Parent uses: className="left-0 top-1/2 -translate-x-full -translate-y-1/2"
 *   This places the connector to the left of the match, vertically centered.
 */
export function BracketConnector({
  type,
  height = 70,
  width = 12,
  showMedian = false,
  medianWidth = 12,
  className = "",
}: BracketConnectorProps) {
  // Common: thickness of lines
  const STROKE = 2;

  if (type === "straight") {
    // Simple horizontal line (used for 1-to-1 transitions)
    // Draws a horizontal line across the full connector width (2 * stalk width)
    return (
      <div
        className={`absolute pointer-events-none ${className}`}
        style={{
          width: `${width * 2}px`,
          height: `${STROKE}px`,
        }}
      >
        <div className="w-full h-full bg-black" />
      </div>
    );
  }

  if (type === "single_line") {
    // Short horizontal stalk (incoming connector)
    return (
      <div
        className={`absolute pointer-events-none ${className}`}
        style={{
          width: `${width}px`,
          height: `${STROKE}px`,
        }}
      >
        <div className="w-full h-full bg-black" />
      </div>
    );
  }

  if (type === "fork_top") {
    // Top half of a fork: ─┐
    // The anchor is at match center. This connector draws:
    // - Horizontal stalk going right from anchor
    // - Vertical bar going DOWN from the end of the stalk
    //
    // Container: height = fork height, positioned at match center
    // Since anchor is at match center and we draw DOWN, the container
    // extends downward from the anchor point.
    return (
      <div
        className={`absolute pointer-events-none ${className}`}
        style={{
          height: `${height}px`,
          width: `${width + STROKE}px`,
        }}
      >
        {/* Horizontal Stalk - at the TOP of this container (the anchor point) */}
        <div
          className="absolute top-0 left-0 bg-black"
          style={{
            width: `${width}px`,
            height: `${STROKE}px`,
            marginTop: "-1px",
          }}
        />
        {/* Vertical Bar - going down from stalk end */}
        <div
          className="absolute top-0 bg-black"
          style={{
            width: `${STROKE}px`,
            height: `calc(100% + 1px)`,
            left: `${width}px`,
            marginTop: "-1px",
          }}
        />
        {/* Median Bridge (optional) - horizontal line at the bottom of the vertical bar */}
        {showMedian && (
          <div
            className="absolute bg-black"
            style={{
              bottom: "-1px",
              left: `${width}px`,
              width: `${medianWidth}px`,
              height: `${STROKE}px`,
            }}
          />
        )}
      </div>
    );
  }

  if (type === "fork_bottom") {
    // Bottom half of a fork: ─┘
    // The anchor is at match center. This connector draws:
    // - Horizontal stalk going right from anchor
    // - Vertical bar going UP from the end of the stalk
    //
    // Container: height = fork height, positioned at match center
    // Since anchor is at match center and we draw UP, we need to
    // OFFSET the container upward by its height so the bottom is at anchor.
    return (
      <div
        className={`absolute pointer-events-none ${className}`}
        style={{
          height: `${height}px`,
          width: `${width + STROKE}px`,
          marginTop: `-${height}px`, // Shift up so bottom is at anchor
        }}
      >
        {/* Horizontal Stalk - at the BOTTOM of this container (the anchor point) */}
        <div
          className="absolute bottom-0 left-0 bg-black"
          style={{
            width: `${width}px`,
            height: `${STROKE}px`,
            marginBottom: "-1px",
          }}
        />
        {/* Vertical Bar - going up from stalk end */}
        <div
          className="absolute bottom-0 bg-black"
          style={{
            width: `${STROKE}px`,
            height: `calc(100% + 1px)`,
            left: `${width}px`,
            marginBottom: "-1px",
          }}
        />
      </div>
    );
  }

  return null;
}

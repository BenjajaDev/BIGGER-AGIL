import { BRAILLE_SPEC as SPEC, type BraillePlate } from '@bigger/shared';

/** Which of the six dots of a cell are raised: dots 1-3 on the left column, 4-6 on the right. */
function raisedDots(mask: number): { column: number; row: number }[] {
  const dots: { column: number; row: number }[] = [];
  for (let dot = 0; dot < 6; dot += 1) {
    if ((mask & (1 << dot)) !== 0) dots.push({ column: Math.floor(dot / 3), row: dot % 3 });
  }
  return dots;
}

/** Top view of the plate exactly as it will be printed, to review it before printing. */
export function BraillePlatePreview({ plate }: { plate: BraillePlate }) {
  const { plateWidthMm: width, plateHeightMm: height, cornerCutMm: cut } = SPEC;
  const qrLeft = width - SPEC.marginRightMm - SPEC.qrMarkerSizeMm;
  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      role="img"
      aria-label={`Vista previa de la placa braille ${plate.categoryName}`}
      style={{ width: '100%', height: 'auto' }}
    >
      <polygon
        points={`${String(cut)},0 ${String(width)},0 ${String(width)},${String(height)} 0,${String(height)} 0,${String(cut)}`}
        fill="var(--surface-muted)"
        stroke="var(--accent)"
        strokeWidth={0.6}
      />
      <text
        x={SPEC.marginLeftMm}
        y={17}
        fontSize={7}
        fontWeight={700}
        fontFamily="var(--font-display)"
        fill="var(--text-primary)"
      >
        {plate.titleText}
      </text>
      <rect
        x={qrLeft}
        y={8}
        width={SPEC.qrMarkerSizeMm}
        height={SPEC.qrMarkerSizeMm}
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth={1.4}
      />
      {plate.lines.map((line, lineIndex) => {
        const top = SPEC.firstLineMm + lineIndex * SPEC.linePitchMm;
        return (
          <g key={`${String(lineIndex)}-${line.text}`}>
            {line.cells.flatMap((mask, cellIndex) =>
              raisedDots(mask).map(({ column, row }) => (
                <circle
                  key={`${String(cellIndex)}-${String(column)}-${String(row)}`}
                  cx={SPEC.marginLeftMm + cellIndex * SPEC.cellPitchMm + column * SPEC.dotSpacingMm}
                  cy={top + row * SPEC.dotSpacingMm}
                  r={SPEC.dotDiameterMm / 2}
                  fill="var(--accent)"
                />
              )),
            )}
            <text x={SPEC.marginLeftMm} y={top + 7.4} fontSize={2.1} fill="var(--text-secondary)">
              {line.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

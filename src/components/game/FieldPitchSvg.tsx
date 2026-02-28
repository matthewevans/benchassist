import { forwardRef, useId } from 'react';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Half-field viewBox: y ∈ [-20, 555]  (defending half with padding)
// Full-field viewBox: y ∈ [-545, 555] (mirrored attacking half above y=0)
// ---------------------------------------------------------------------------

const HALF_VIEWBOX = '-30 -20 740 575';
const FULL_VIEWBOX = '-30 -545 740 1100';

// Shared defensive-half field markings (penalty area, goal area, arcs, corners, goal mouth)
const DEFENSIVE_MARKINGS = (
  <>
    <path d="M248.5 0 A91.5 91.5 0 0 1 431.5 0" />
    <rect x={138.4} y={360} width={403.2} height={165} />
    <rect x={248.4} y={470} width={183.2} height={55} />
    <path d="M266.87 360 A91.5 91.5 0 0 1 413.13 360" />
    <path d="M10 525 A10 10 0 0 0 0 515" />
    <path d="M670 525 A10 10 0 0 1 680 515" />
  </>
);

interface Props {
  fullField?: boolean;
  children?: ReactNode;
}

export const FieldPitchSvg = forwardRef<SVGSVGElement, Props>(function FieldPitchSvg(
  { fullField = false, children },
  ref,
) {
  const id = useId();
  const clipId = `fv-clip${id}`;
  const shadowId = `fv-shadow${id}`;
  const viewBox = fullField ? FULL_VIEWBOX : HALF_VIEWBOX;

  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
      style={{ transition: 'viewBox 0s' }}
      role="img"
    >
      <defs>
        <clipPath id={clipId}>
          {fullField ? (
            <rect x={0} y={-525} width={680} height={1050} />
          ) : (
            <rect width={680} height={525} />
          )}
        </clipPath>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx={0} dy={1} stdDeviation={2} floodOpacity={0.25} />
        </filter>
      </defs>

      {/* Grass background */}
      {fullField ? (
        <>
          <rect x={-30} y={-545} width={740} height={1100} fill="#3a7a33" />
          <rect x={0} y={-525} width={680} height={1050} fill="#4a9e42" />
        </>
      ) : (
        <>
          <rect x={-30} y={-20} width={740} height={575} fill="#3a7a33" />
          <rect width={680} height={525} fill="#4a9e42" />
        </>
      )}

      {/* Grass stripes */}
      <g clipPath={`url(#${clipId})`} fill="#fff" opacity={0.06}>
        {fullField && (
          <>
            <rect y={-525} width={680} height={75} />
            <rect y={-375} width={680} height={75} />
            <rect y={-225} width={680} height={75} />
            <rect y={-75} width={680} height={75} />
          </>
        )}
        <rect y={0} width={680} height={75} />
        <rect y={150} width={680} height={75} />
        <rect y={300} width={680} height={75} />
        <rect y={450} width={680} height={75} />
      </g>

      {/* Field markings */}
      <g fill="none" stroke="#fff" strokeWidth={2.5}>
        {fullField ? (
          <rect x={0} y={-525} width={680} height={1050} />
        ) : (
          <rect width={680} height={525} />
        )}
        {DEFENSIVE_MARKINGS}

        {/* Attacking half — mirrored markings */}
        {fullField && <g transform="scale(1,-1)">{DEFENSIVE_MARKINGS}</g>}

        {/* Centre line + centre circle (full field only) */}
        {fullField && (
          <>
            <line x1={0} y1={0} x2={680} y2={0} />
            <circle cx={340} cy={0} r={91.5} />
          </>
        )}
      </g>

      {/* Goal mouth — defending end */}
      <rect
        x={303.4}
        y={525}
        width={73.2}
        height={20}
        rx={3}
        fill="none"
        stroke="#fff"
        strokeWidth={2}
      />

      {/* Goal mouth — attacking end (full field only) */}
      {fullField && (
        <rect
          x={303.4}
          y={-545}
          width={73.2}
          height={20}
          rx={3}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
        />
      )}

      {/* Centre spot */}
      <circle cx={340} cy={0} r={4} fill="#fff" />
      {/* Penalty spot — defending end */}
      <circle cx={340} cy={415} r={3.5} fill="#fff" />
      {/* Penalty spot — attacking end (full field only) */}
      {fullField && <circle cx={340} cy={-415} r={3.5} fill="#fff" />}

      <g filter={`url(#${shadowId})`}>{children}</g>
    </svg>
  );
});

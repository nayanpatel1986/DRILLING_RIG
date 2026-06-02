import React from 'react';

const BitWeightGauge = ({ value = 0, bitWeight = 0 }) => {
    const MIN = 0;
    const MAX = 200;
    const MAJOR_STEP = 25;   // Major ticks at 0, 25, 50, 75, 100, 125, 150, 175, 200
    const MINOR_STEP = 5;    // Minor ticks every 5 tons

    // Gauge arc geometry
    const cx = 150, cy = 150, r = 120;
    const startAngle = 225;  // Bottom-left
    const endAngle = -45;    // Bottom-right (clockwise sweep of 270°)
    const totalSweep = 270;

    const clampedValue = Math.min(MAX, Math.max(MIN, value));

    // Convert a data value to angle (degrees)
    const valueToAngle = (v) => {
        const fraction = (v - MIN) / (MAX - MIN);
        return startAngle - fraction * totalSweep;
    };

    // Convert angle (degrees) to SVG x,y
    const angleToXY = (angleDeg) => {
        const rad = (angleDeg * Math.PI) / 180;
        return { x: cx + Math.cos(rad) * r, y: cy - Math.sin(rad) * r };
    };

    // Build arc path for background track
    const arcPath = (startDeg, endDeg, radius) => {
        const s = angleToXY2(startDeg, radius);
        const e = angleToXY2(endDeg, radius);
        const sweep = startDeg - endDeg;
        const largeArc = sweep > 180 ? 1 : 0;
        return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
    };

    const angleToXY2 = (angleDeg, radius) => {
        const rad = (angleDeg * Math.PI) / 180;
        return { x: cx + Math.cos(rad) * radius, y: cy - Math.sin(rad) * radius };
    };

    // Generate tick marks
    const majorTicks = [];
    const minorTicks = [];
    for (let v = MIN; v <= MAX; v += MINOR_STEP) {
        const angle = valueToAngle(v);
        const isMajor = v % MAJOR_STEP === 0;
        const innerR = isMajor ? r - 20 : r - 12;
        const outerR = r - 2;
        const p1 = angleToXY2(angle, innerR);
        const p2 = angleToXY2(angle, outerR);

        if (isMajor) {
            majorTicks.push({ v, angle, p1, p2 });
        } else {
            minorTicks.push({ v, angle, p1, p2 });
        }
    }

    // Needle endpoint
    const needleAngle = valueToAngle(clampedValue);
    const needleTip = angleToXY2(needleAngle, r - 28);
    const needleBase1 = angleToXY2(needleAngle + 90, 5);
    const needleBase2 = angleToXY2(needleAngle - 90, 5);

    // Color zones: green (0-100), yellow (100-150), red (150-200)
    const greenEnd = valueToAngle(100);
    const yellowEnd = valueToAngle(150);

    return (
        <div className="flex flex-col items-center">
            <svg viewBox="0 0 300 250" width="100%" height="100%" className="max-w-[280px]">
                {/* Background arc track */}
                <path
                    d={arcPath(startAngle, endAngle, r)}
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="22"
                    strokeLinecap="round"
                />

                {/* Color zones */}
                <path
                    d={arcPath(startAngle, greenEnd, r)}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.3"
                />
                <path
                    d={arcPath(greenEnd, yellowEnd, r)}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.3"
                />
                <path
                    d={arcPath(yellowEnd, endAngle, r)}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.3"
                />

                {/* Active value arc */}
                {clampedValue > 0 && (
                    <path
                        d={arcPath(startAngle, needleAngle, r)}
                        fill="none"
                        stroke={clampedValue > 150 ? '#EF4444' : clampedValue > 100 ? '#F59E0B' : '#10B981'}
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                )}

                {/* Minor tick marks */}
                {minorTicks.map((t, i) => (
                    <line
                        key={`minor-${i}`}
                        x1={t.p1.x} y1={t.p1.y}
                        x2={t.p2.x} y2={t.p2.y}
                        stroke="#4B5563"
                        strokeWidth="1"
                    />
                ))}

                {/* Major tick marks */}
                {majorTicks.map((t, i) => (
                    <g key={`major-${i}`}>
                        <line
                            x1={t.p1.x} y1={t.p1.y}
                            x2={t.p2.x} y2={t.p2.y}
                            stroke="#9CA3AF"
                            strokeWidth="2.5"
                        />
                        {/* Tick labels */}
                        <text
                            x={angleToXY2(t.angle, r - 32).x}
                            y={angleToXY2(t.angle, r - 32).y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#9CA3AF"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                        >
                            {t.v}
                        </text>
                    </g>
                ))}

                {/* Needle */}
                <polygon
                    points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
                    fill={clampedValue > 150 ? '#EF4444' : clampedValue > 100 ? '#F59E0B' : '#10B981'}
                    stroke="none"
                />
                {/* Needle center dot */}
                <circle cx={cx} cy={cy} r="8" fill="#1E293B" stroke="#6B7280" strokeWidth="2" />
                <circle cx={cx} cy={cy} r="4" fill="#9CA3AF" />

                {/* Center value display */}
                <text
                    x={cx}
                    y={cy + 38}
                    textAnchor="middle"
                    fill="white"
                    fontSize="26"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                >
                    {clampedValue.toFixed(1)}
                </text>
                <text
                    x={cx}
                    y={cy + 54}
                    textAnchor="middle"
                    fill="#6B7280"
                    fontSize="10"
                >
                    tons
                </text>

                {/* Bit Weight secondary display */}
                <rect x={cx - 48} y={cy + 64} width="96" height="24" rx="4" fill="#1E293B" stroke="#374151" strokeWidth="1" />
                <text
                    x={cx}
                    y={cy + 73}
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize="8"
                    fontWeight="bold"
                >
                    BIT WEIGHT
                </text>
                <text
                    x={cx}
                    y={cy + 85}
                    textAnchor="middle"
                    fill="#F59E0B"
                    fontSize="12"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                >
                    {bitWeight.toFixed(1)} ton
                </text>
            </svg>
            <div className="text-center -mt-2">
                <span className="text-sm font-bold text-gray-300 uppercase tracking-wider">Hook Load</span>
            </div>
        </div>
    );
};

export default BitWeightGauge;

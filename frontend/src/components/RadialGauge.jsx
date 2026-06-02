import React from 'react';

/**
 * Reusable radial gauge component (Outer Ticks Arc Style).
 */
const RadialGauge = ({
    value = 0,
    min = 0,
    max = 100,
    majorStep = 10,
    minorStep = 2,
    label = '',
    unit = '',
    size = 'md',
    subValue,
    subLabel,
    subUnit,
    subValues,
    onUnitClick,
    onSubUnitClick,
    onLabelClick,
    onSubLabelClick,
}) => {
    const cx = 150, cy = 150;
    const r = 135; 
    const startAngle = 225;
    const totalSweep = 270;
    const clamped = Math.min(max, Math.max(min, value));

    const valToAngle = (v) => startAngle - (((v - min) / ((max - min) || 1)) * totalSweep);

    const toXY = (deg, radius) => {
        const rad = (deg * Math.PI) / 180;
        return { x: cx + Math.cos(rad) * radius, y: cy - Math.sin(rad) * radius };
    };

    const needleAngle = valToAngle(clamped);

    const majors = [];
    const minors = [];
    
    // Automatically determine steps if not provided robustly for 1000 klbs gauges
    const actualMajorStep = max - min >= 1000 ? 100 : majorStep;
    const actualMinorStep = max - min >= 1000 ? 20 : minorStep;

    for (let v = min; v <= max; v += actualMinorStep) {
        const angle = valToAngle(v);
        const isMajor = (v - min) % actualMajorStep === 0;
        
        const outerR = r;
        const innerR = isMajor ? r - 12 : r - 6;
        
        const p1 = toXY(angle, outerR);
        const p2 = toXY(angle, innerR);
        
        if (isMajor) majors.push({ v, angle, p1, p2 });
        else minors.push({ v, angle, p1, p2 });
        if (majors.length + minors.length > 200) break;
    }

    const tip = toXY(needleAngle, r - 35); 
    const baseWidth = 4;
    const b1 = toXY(needleAngle + 90, baseWidth);
    const b2 = toXY(needleAngle - 90, baseWidth);

    const hasSubValue = subValue !== undefined && subLabel;
    const hasSubValues = subValues && subValues.length > 0;
    
    const viewH = hasSubValues ? 320 : 280;
    const sizeClass = size === 'lg' ? 'w-full' : size === 'sm' ? 'max-w-[240px] w-full' : 'max-w-[320px] w-full';
    const spmColors = ['#FFFFFF', '#22C55E', '#F59E0B'];

    // Convert old klbs to ton for the new visual aesthetic requested via screenshot
    const displayLabel = label === 'BIT WEIGHT' ? 'WOH' : label.toUpperCase();
    const displayUnit = unit === 'klbs' ? 'ton' : unit;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-0">
            <svg viewBox={`10 10 280 ${viewH}`} width="100%" height="100%" className={sizeClass} style={{ maxHeight: '100%' }}>
                
                {/* Background dark circle to frame the gauge slightly */}
                <circle cx={cx} cy={cy} r={r + 5} fill="#0B131E" stroke="#1E293B" strokeWidth="2" opacity="0.6" />

                {/* Minor Ticks */}
                {minors.map((t, i) => (
                    <line key={`min-${i}`} x1={t.p1.x} y1={t.p1.y} x2={t.p2.x} y2={t.p2.y} stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
                ))}

                {/* Major Ticks */}
                {majors.map((t, i) => (
                    <g key={`maj-${i}`}>
                        <line x1={t.p1.x} y1={t.p1.y} x2={t.p2.x} y2={t.p2.y} stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                        <text
                            x={toXY(t.angle, r - 26).x} y={toXY(t.angle, r - 26).y}
                            textAnchor="middle" dominantBaseline="central"
                            fill="#9CA3AF" fontSize="22" fontWeight="bold" fontFamily="sans-serif"
                        >
                            {t.v}
                        </text>
                    </g>
                ))}

                {/* Main Label Center Top */}
                {label && (
                    <text x={cx} y={cy - 48} textAnchor="middle" fill="#9CA3AF" fontSize="24" fontWeight="bold" letterSpacing="1"
                          onClick={onLabelClick} className={onLabelClick ? "cursor-pointer hover:fill-white transition-colors" : ""}>
                        {displayLabel}
                    </text>
                )}

                {/* Main Value Center */}
                <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize="72" fontWeight="bold" fontFamily="sans-serif">
                    {Number.isInteger(clamped) ? clamped : clamped.toFixed(1)}
                </text>

                {/* Main Unit */}
                <text x={cx} y={cy + 30} textAnchor="middle" fill="#6B7280" fontSize="22" fontWeight="500" onClick={onUnitClick} className="cursor-pointer">
                    {displayUnit}
                </text>

                {/* Horizontal Divider */}
                {(hasSubValue || hasSubValues) && (
                    <line x1={cx - 35} y1={cy + 45} x2={cx + 35} y2={cy + 45} stroke="#334155" strokeWidth="1.5" />
                )}

                {/* Sub Value Bottom Center */}
                {hasSubValue && (
                    <g>
                        <text x={cx} y={cy + 82} textAnchor="middle" fill="#bef264" fontSize="42" fontWeight="bold" fontFamily="sans-serif">
                            {typeof subValue === 'number' ? subValue.toFixed(1) : subValue}
                        </text>
                        <text x={cx} y={cy + 105} textAnchor="middle" fill="#9CA3AF" fontSize="18" fontWeight="500" 
                              onClick={onSubLabelClick || onSubUnitClick} 
                              className={onSubLabelClick || onSubUnitClick ? "cursor-pointer hover:fill-white transition-colors" : ""}>
                            {subLabel.toUpperCase()} {subUnit ? `(${subUnit})` : `(${displayUnit})`}
                        </text>
                    </g>
                )}

                {/* Multiple Sub Values Support */}
                {hasSubValues && !hasSubValue && (
                    <g>
                        {subValues.map((sv, idx) => {
                            const cols = subValues.length;
                            const colW = 280 / cols;
                            const xPos = cx - 140 + colW * idx + colW / 2;
                            const color = spmColors[idx] || '#FFFFFF';
                            return (
                                <g key={idx}>
                                    <text x={xPos} y={cy + 80} textAnchor="middle" fill={color} fontSize="30" fontWeight="bold" fontFamily="sans-serif">
                                        {typeof sv.value === 'number' ? sv.value.toFixed(0) : sv.value}
                                    </text>
                                    <text x={xPos} y={cy + 102} textAnchor="middle" fill="#6B7280" fontSize="14" fontWeight="bold">
                                        {sv.label}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                )}

                {/* Needle Polygon (drawn last so it overlays text if needed) */}
                <polygon points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`} fill="#38BDF8" />

                {/* Hollow Needle Base */}
                <circle cx={cx} cy={cy} r="6" fill="#111319" stroke="#38BDF8" strokeWidth="2.5" />

            </svg>
        </div>
    );
};

export default RadialGauge;

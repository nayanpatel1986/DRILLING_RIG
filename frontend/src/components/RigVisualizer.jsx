import React from 'react';

/**
 * RigVisualizer — An SVG-based rig schematic with animated traveling block.
 * The block position moves up/down based on the `blockPosition` prop (0–30 m range).
 * Also shows key parameter labels positioned on the rig.
 */
export default function RigVisualizer({ blockPosition = 0, hookLoad = 0, wob = 0, rpm = 0, rop = 0, depth = 0, spp = 0, torque = 0 }) {
    // Block position range: 0m (bottom) to 30m (top)
    const maxTravel = 30;
    const clampedPos = Math.max(0, Math.min(blockPosition, maxTravel));
    const travelPercent = clampedPos / maxTravel; // 0 = bottom, 1 = top

    // SVG coordinates: derrick top ~60, bottom ~360
    const derrickTop = 60;
    const derrickBottom = 360;
    const blockY = derrickBottom - travelPercent * (derrickBottom - derrickTop - 40);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 360 460" className="w-full h-full max-h-[520px]" style={{ filter: 'drop-shadow(0 0 20px rgba(0,163,224,0.15))' }}>
                <defs>
                    <linearGradient id="derrickGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00A3E0" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#064E6E" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9CA3AF" />
                        <stop offset="100%" stopColor="#4B5563" />
                    </linearGradient>
                    <linearGradient id="blockGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="100%" stopColor="#B45309" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Ground / Rig Floor */}
                <rect x="60" y="370" width="240" height="8" rx="2" fill="#374151" />
                <rect x="40" y="378" width="280" height="15" rx="3" fill="#1F2937" stroke="#374151" strokeWidth="1" />
                <text x="180" y="390" textAnchor="middle" fill="#6B7280" fontSize="8" fontFamily="sans-serif">RIG FLOOR</text>

                {/* Substructure */}
                <rect x="80" y="393" width="15" height="50" fill="#374151" />
                <rect x="265" y="393" width="15" height="50" fill="#374151" />
                <rect x="60" y="440" width="240" height="10" rx="2" fill="#1F2937" stroke="#374151" strokeWidth="1" />

                {/* Derrick / Mast — two legs */}
                <line x1="100" y1="370" x2="155" y2="45" stroke="url(#derrickGrad)" strokeWidth="4" />
                <line x1="260" y1="370" x2="205" y2="45" stroke="url(#derrickGrad)" strokeWidth="4" />

                {/* Derrick cross-members */}
                {[100, 150, 200, 250, 300, 340].map((y, i) => {
                    const ratio = (370 - y) / (370 - 45);
                    const leftX = 100 + ratio * (155 - 100);
                    const rightX = 260 - ratio * (260 - 205);
                    return <line key={i} x1={leftX} y1={y} x2={rightX} y2={y} stroke="#0E7490" strokeWidth="1.5" opacity="0.5" />;
                })}

                {/* Crown Block (top) */}
                <rect x="150" y="40" width="60" height="18" rx="3" fill="#1E3A5F" stroke="#00A3E0" strokeWidth="1" />
                <circle cx="165" cy="49" r="5" fill="none" stroke="#00A3E0" strokeWidth="1.5" />
                <circle cx="195" cy="49" r="5" fill="none" stroke="#00A3E0" strokeWidth="1.5" />

                {/* Deadline wire (top to block) */}
                <line x1="165" y1="54" x2="165" y2={blockY} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="3,2" />
                <line x1="195" y1="54" x2="195" y2={blockY} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="3,2" />

                {/* Traveling Block — moves with block position */}
                <g style={{ transition: 'transform 0.5s ease-out' }}>
                    <rect x="152" y={blockY} width="56" height="22" rx="4" fill="url(#blockGrad)" stroke="#F59E0B" strokeWidth="1.5" filter="url(#glow)" />
                    <text x="180" y={blockY + 15} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
                        BLOCK
                    </text>
                </g>

                {/* Hook & Swivel */}
                <line x1="180" y1={blockY + 22} x2="180" y2={blockY + 35} stroke="#D1D5DB" strokeWidth="2" />
                <rect x="172" y={blockY + 35} width="16" height="12" rx="2" fill="#374151" stroke="#6B7280" strokeWidth="1" />

                {/* Drill String (from swivel down through rotary table) */}
                <rect x="176" y={blockY + 47} width="8" height={370 - blockY - 47} fill="url(#pipeGrad)" />

                {/* Rotary Table */}
                <ellipse cx="180" cy="372" rx="25" ry="6" fill="#1E3A5F" stroke="#00A3E0" strokeWidth="1.5" />

                {/* Bit at bottom of drill string — below rotary */}
                <polygon points="172,410 180,430 188,410" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />

                {/* Mud Pump (left side) */}
                <rect x="10" y="350" width="40" height="30" rx="4" fill="#1E293B" stroke="#374151" strokeWidth="1" />
                <text x="30" y="369" textAnchor="middle" fill="#6B7280" fontSize="7" fontFamily="sans-serif">PUMP</text>
                <line x1="50" y1="365" x2="80" y2="375" stroke="#0EA5E9" strokeWidth="1.5" strokeDasharray="4,2" />

                {/* Engine (right side) */}
                <rect x="310" y="350" width="40" height="30" rx="4" fill="#1E293B" stroke="#374151" strokeWidth="1" />
                <text x="330" y="369" textAnchor="middle" fill="#6B7280" fontSize="7" fontFamily="sans-serif">ENG</text>

                {/* ─── Parameter Labels ─── */}

                {/* Block Position label */}
                <g>
                    <rect x="220" y={blockY - 2} width="90" height="18" rx="3" fill="rgba(0,0,0,0.75)" stroke="#F59E0B" strokeWidth="0.8" />
                    <text x="228" y={blockY + 11} fill="#9CA3AF" fontSize="7" fontFamily="sans-serif">BPOS</text>
                    <text x="302" y={blockY + 11} textAnchor="end" fill="#F59E0B" fontSize="8" fontWeight="bold" fontFamily="sans-serif">{clampedPos.toFixed(1)}m</text>
                </g>

            </svg>
        </div>
    );
}

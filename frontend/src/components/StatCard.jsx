import React from 'react';
import { default as clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const StatCard = ({ title, value, unit, icon: Icon, trend, status = 'neutral', className }) => {
    const statusColors = {
        neutral: 'text-gray-400',
        success: 'text-nov-success',
        warning: 'text-nov-warning',
        danger: 'text-nov-danger',
    };

    return (
        <div className={cn("card relative overflow-hidden group hover:border-nov-accent/30 transition-colors", className)}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</span>
                {Icon && <Icon className="text-nov-accent/50 group-hover:text-nov-accent transition-colors" size={20} />}
            </div>

            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-sans tabular-nums tracking-tight">{value}</span>
                {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
            </div>

            {trend && (
                <div className={cn("text-xs font-medium mt-2 flex items-center gap-1",
                    trend > 0 ? 'text-nov-success' : 'text-nov-danger'
                )}>
                    <span>{trend > 0 ? '↑' : '↓'}</span>
                    <span>{Math.abs(trend)}% from last hour</span>
                </div>
            )}

            {/* Status Indicator */}
            <div className={cn("absolute top-0 right-0 w-1 h-full opacity-50",
                status === 'danger' ? 'bg-nov-danger' :
                    status === 'warning' ? 'bg-nov-warning' : 'bg-transparent'
            )} />
        </div>
    );
};

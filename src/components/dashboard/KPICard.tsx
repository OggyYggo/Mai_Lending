"use client";

import { useEffect, useRef } from "react";
import { type LucideIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { animateCountUp } from "@/lib/gsap-utils";

const colorMap = {
  blue: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  },
  green: {
    border: "border-l-green-500",
    iconBg: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
  },
  red: {
    border: "border-l-red-500",
    iconBg: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
  },
  purple: {
    border: "border-l-purple-500",
    iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  },
};

interface KPICardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: "blue" | "green" | "amber" | "red" | "purple";
  description?: string;
}

export function KPICard({
  title,
  value,
  prefix = "",
  suffix = "",
  icon: Icon,
  trend,
  trendLabel,
  color = "blue",
  description,
}: KPICardProps) {
  const valueRef = useRef<HTMLSpanElement>(null);
  const colors = colorMap[color];

  useEffect(() => {
    if (!valueRef.current) return;
    animateCountUp(valueRef.current, value, 1.8, prefix, suffix);
  }, [value, prefix, suffix]);

  return (
    <Card className={`border-l-4 ${colors.border}`}>
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">
            <span ref={valueRef}>
              {prefix}0{suffix}
            </span>
          </p>

          {trend !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              {trend >= 0 ? (
                <TrendingUpIcon className="size-3.5 text-green-600" />
              ) : (
                <TrendingDownIcon className="size-3.5 text-red-600" />
              )}
              <span
                className={trend >= 0 ? "text-green-600" : "text-red-600"}
              >
                {trend >= 0 ? "+" : ""}
                {trend.toFixed(1)}%
              </span>
              {trendLabel && (
                <span className="text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}

          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>

        <div className={`rounded-full p-2.5 ${colors.iconBg}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { animateCountUp } from "@/lib/gsap-utils";

function getColor(rate: number) {
  if (rate >= 80) return "#22c55e";
  if (rate >= 60) return "#f59e0b";
  return "#ef4444";
}

function getLabel(rate: number) {
  if (rate >= 80) return "Excellent";
  if (rate >= 60) return "Average";
  return "Needs Attention";
}

interface CollectionRateChartProps {
  rate: number;
}

export function CollectionRateChart({ rate }: CollectionRateChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  const color = getColor(rate);
  const label = getLabel(rate);

  const chartData = [
    { name: "rate", value: rate, fill: color },
  ];

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        chartRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.4)" }
      );
    }, chartRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!valueRef.current) return;
    animateCountUp(valueRef.current, rate, 1.8, "", "%");
  }, [rate]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Collection Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} className="flex flex-col items-center">
          <div className="relative h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                startAngle={180}
                endAngle={0}
                barSize={14}
                data={chartData}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  background={{ fill: "hsl(var(--muted))" }}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                ref={valueRef}
                className="text-3xl font-bold"
                style={{ color }}
              >
                0%
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlusIcon,
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecentActivity } from "@/lib/actions/dashboard";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

const iconConfig = {
  borrower: {
    Icon: UserPlusIcon,
    className: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
  },
  loan: {
    Icon: FileTextIcon,
    className: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  },
  payment: {
    Icon: CreditCardIcon,
    className: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
  },
};

interface RecentActivityProps {
  activities: RecentActivity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-activity-item]",
        { x: 20, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: "power3.out",
        }
      );
    }, listRef);
    return () => ctx.revert();
  }, [activities]);

  // Determine icon and color for loan activities based on description
  const getLoanIcon = (description: string) => {
    if (description.includes("approved")) {
      return {
        Icon: CheckCircleIcon,
        className: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
      };
    }
    if (description.includes("rejected")) {
      return {
        Icon: XCircleIcon,
        className: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
      };
    }
    return iconConfig.loan;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={listRef} className="space-y-4">
          {activities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No recent activity.
            </p>
          ) : (
            activities.map((item) => {
              let iconInfo = iconConfig[item.type];
              if (item.type === "loan") {
                iconInfo = getLoanIcon(item.description);
              }

              const { Icon, className } = iconInfo;

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  data-activity-item
                  className="flex items-start gap-3"
                >
                  <div className={`mt-0.5 rounded-full p-1.5 ${className}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 space-y-1 text-sm">
                    <p className="leading-tight">{item.description}</p>
                    {item.amount !== undefined && (
                      <p className="font-semibold">{fmt(item.amount)}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.date), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyState({
  icon: Icon,
  iconColor = "#6C63FF",
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center" style={{ padding: "48px 24px" }}>
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          background: "rgba(108,99,255,0.08)",
          border: "1px solid #2A2A3E",
        }}
      >
        <Icon style={{ width: 36, height: 36, color: iconColor }} />
      </div>
      <h3 className="font-semibold mt-4" style={{ fontSize: 18, color: "#F0F0FF" }}>
        {title}
      </h3>
      <p style={{ fontSize: 14, color: "#9090B0", marginTop: 8, maxWidth: 360 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6 bg-primary text-white hover:bg-primary/90">
          {actionLabel}
        </Button>
      )}
      {secondaryLabel && onSecondary && (
        <Button variant="ghost" onClick={onSecondary} className="mt-3 text-muted-foreground">
          {secondaryLabel}
        </Button>
      )}
    </div>
  );
}

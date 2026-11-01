"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, HelpCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuGuideBannerProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  className?: string;
}

export function MenuGuideBanner({
  title,
  description,
  actionLabel,
  onAction,
  onClose,
  className,
}: MenuGuideBannerProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-3.5 sm:p-4 mb-4 rounded-xl shadow-2xs animate-in fade-in-50 duration-200",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
          <HelpCircle className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>

          {actionLabel && onAction && (
            <div className="mt-2.5">
              <Button
                size="sm"
                variant="outline"
                onClick={onAction}
                className="h-7 px-2.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 font-medium"
              >
                {actionLabel} <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          type="button"
          aria-label="Tutup panduan"
          className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}

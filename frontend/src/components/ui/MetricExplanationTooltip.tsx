import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MetricExplanation } from "@/types";

interface MetricExplanationTooltipProps {
  explanation: MetricExplanation;
  children: React.ReactNode;
}

export function MetricExplanationTooltip({ explanation, children }: MetricExplanationTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent variant="editorial" sideOffset={8} className="max-w-xs space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {explanation.display_name || explanation.metric_name}
          </span>
          <p className="text-[13px] font-medium leading-snug">{explanation.definition}</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">{explanation.meaning}</p>
          <div className="border-t border-border pt-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Current Value
            </span>
            <p className="text-[12px] leading-relaxed">{explanation.current_value_assessment}</p>
          </div>
          {explanation.good_threshold && (
            <div className="border-t border-border pt-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Good Range
              </span>
              <p className="text-[12px] leading-relaxed">{explanation.good_threshold}</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

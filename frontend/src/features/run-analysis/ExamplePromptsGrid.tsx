import { ArrowRight, ChartBar, Scales } from "@phosphor-icons/react";
import { useState } from "react";
import { Eyebrow } from "@/components/ui/editorial";

interface ExamplePrompt {
  tag: string;
  text: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    tag: "Compare",
    text: "Compare NVDA to AMD across AI compute margins and supply constraints.",
  },
  {
    tag: "Sector",
    text: "Is the energy sector's dividend growth sustainable through 2027?",
  },
  {
    tag: "Stress",
    text: "Stress-test US regional banks under a 300bps rate-hike shock.",
  },
  {
    tag: "Single",
    text: "Build the bull and bear case for TSM, focusing on geopolitical risk.",
  },
];

interface ExamplePromptsGridProps {
  onSelect: (text: string) => void;
}

export function ExamplePromptsGrid({ onSelect }: ExamplePromptsGridProps) {
  const [showAll, setShowAll] = useState(false);
  const visibleExamples = showAll ? EXAMPLE_PROMPTS : EXAMPLE_PROMPTS.slice(0, 2);

  return (
    <div id="research-examples" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Start from an example</Eyebrow>
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="inline-flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {showAll ? "Show fewer" : "View all examples"}
          <ArrowRight size={14} weight="bold" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibleExamples.map((example, index) => {
          const Icon = index === 0 ? Scales : ChartBar;
          return (
            <button
              key={example.text}
              type="button"
              onClick={() => onSelect(example.text)}
              className="group flex min-h-[76px] items-center gap-4 rounded-[6px] border border-[#e6e9ef] bg-white px-5 text-left transition-colors hover:border-[#c9d3e2] hover:bg-[#fbfdff]"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#eff5ff] text-[#155dff]">
                <Icon size={22} weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-snug text-[#171b23]">
                  {example.tag}
                </span>
                <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-[#687182]">
                  {example.text}
                </span>
              </span>
              <ArrowRight
                size={17}
                weight="bold"
                className="shrink-0 text-[#7b8493] transition-transform group-hover:translate-x-0.5 group-hover:text-[#171b23]"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

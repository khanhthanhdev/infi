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
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <Eyebrow>Start from an example</Eyebrow>
        <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground/70">
          {String(EXAMPLE_PROMPTS.length).padStart(2, "0")}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example.text}
            type="button"
            onClick={() => onSelect(example.text)}
            className="group flex flex-col gap-2 border border-border bg-transparent p-4 text-left transition-colors hover:border-foreground hover:bg-muted/40"
          >
            <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {example.tag}
            </span>
            <span className="text-[13px] leading-snug text-foreground">{example.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

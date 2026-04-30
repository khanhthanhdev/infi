import { Plus } from "@phosphor-icons/react";
import { Eyebrow } from "@/components/ui/editorial";

const QUICK_TICKERS = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "META", name: "Meta" },
  { symbol: "AMZN", name: "Amazon" },
];

interface StockTickerChipsProps {
  onSelect: (symbol: string) => void;
}

export function StockTickerChips({ onSelect }: StockTickerChipsProps) {
  return (
    <div className="space-y-3">
      <Eyebrow>Quick tickers</Eyebrow>
      <div className="flex flex-wrap gap-3">
        {QUICK_TICKERS.map((ticker) => (
          <button
            key={ticker.symbol}
            type="button"
            onClick={() => onSelect(ticker.symbol)}
            className="group inline-flex h-8 min-w-[68px] items-center justify-center rounded-[5px] border border-[#e4e7ec] bg-white px-4 transition-colors hover:border-[#c9d3e2] hover:bg-[#f8fbff]"
            title={ticker.name}
          >
            <span className="font-mono text-[11px] font-medium tracking-[0.02em] text-[#2d3440]">
              {ticker.symbol}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            document.getElementById("research-composer-input")?.focus();
          }}
          className="inline-flex h-8 items-center gap-2 rounded-[5px] border border-[#e4e7ec] bg-white px-4 text-[12px] font-medium text-[#4c5563] transition-colors hover:border-[#c9d3e2] hover:bg-[#f8fbff] hover:text-[#171b23]"
        >
          <Plus size={13} weight="bold" />
          Add
        </button>
      </div>
    </div>
  );
}

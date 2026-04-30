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
    <div className="space-y-4">
      <Eyebrow>Quick tickers</Eyebrow>
      <div className="flex flex-wrap gap-2">
        {QUICK_TICKERS.map((ticker) => (
          <button
            key={ticker.symbol}
            type="button"
            onClick={() => onSelect(ticker.symbol)}
            className="group inline-flex items-center border border-border bg-transparent px-3 py-1.5 transition-colors hover:border-foreground hover:bg-muted/40"
            title={ticker.name}
          >
            <span className="font-mono text-[11px] font-medium tracking-[0.02em] text-foreground">
              {ticker.symbol}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

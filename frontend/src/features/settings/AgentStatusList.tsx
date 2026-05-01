import { getLogoPath } from "@/lib/agents";
import { cn } from "@/lib/utils";
import type { AgentCandidate } from "@/types";

interface AgentStatusListProps {
  agents: AgentCandidate[];
}

export function AgentStatusList({ agents }: AgentStatusListProps) {
  if (agents.length === 0) {
    return (
      <div className="rounded-[10px] border border-[#e7e9ee] bg-white px-4 py-6 text-sm text-[#3f4653]">
        No ACP agents detected on this machine.
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-[#e7e9ee] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="divide-y divide-[#e7e9ee]">
        {agents.map((agent, index) => (
          <div
            key={agent.id}
            className="grid grid-cols-[32px_28px_1fr_auto] items-center gap-4 px-5 py-4"
          >
            <span className="font-mono text-[11px] tabular-nums text-[#3f4653]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <img
              src={getLogoPath(agent.label)}
              alt=""
              className="h-5 w-5 object-contain opacity-90"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-medium text-[#111827]">{agent.label}</span>
              <span className="truncate font-mono text-[11.5px] text-[#3f4653]">
                {agent.command || "Not found on PATH"}
              </span>
            </div>
            <StatusTag available={agent.available} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusTag({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] border px-2.5 text-[10.5px] font-medium uppercase tracking-[0.14em]",
        available ? "border-[#38a169] bg-[#38a169] text-white" : "border-[#dfe5ee] text-[#3f4653]",
      )}
    >
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", available ? "bg-white" : "bg-[#3f4653]/40")}
      />
      {available ? "Available" : "Missing"}
    </span>
  );
}

import { FileText, Gear, PuzzlePiece } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Eyebrow, SectionHeader } from "@/components/ui/editorial";
import { Input } from "@/components/ui/input";
import { useSettings, useUpdateSettings } from "@/shared/api/queries";
import type { AgentCandidate, AppSettings } from "@/types";
import { AgentStatusList } from "./AgentStatusList";
import { DataSourcesSection } from "./DataSourcesSection";

interface SettingsPageProps {
  agents: AgentCandidate[];
}

const AGENT_FEATURES = [
  { label: "ACP-compatible agents", icon: PuzzlePiece },
  { label: "Local execution", icon: Gear },
  { label: "Source-backed research", icon: FileText },
];

export function SettingsPage({ agents }: SettingsPageProps) {
  const { data: fetchedSettings, error: fetchError } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (fetchedSettings && !localSettings) {
      setLocalSettings(fetchedSettings);
    }
  }, [fetchedSettings, localSettings]);

  const settings = localSettings;
  const error = fetchError ? String(fetchError) : null;

  const save = async () => {
    if (!settings) return;
    try {
      const next = await updateSettingsMutation.mutateAsync(settings);
      setLocalSettings(next);
      setSaved("Saved");
      setTimeout(() => setSaved(null), 1300);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#fbfbfa]">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 pb-44 pt-5 lg:px-8">
          <section className="relative overflow-hidden">
            <div className="flex min-h-[240px] flex-col justify-center px-8 py-9 sm:px-11 lg:w-[62%] xl:w-[58%]">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3572ad]">
                Configure Infi
              </p>
              <h1 className="max-w-[560px] text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-[#111827] sm:text-[52px]">
                Settings &amp; configuration.
              </h1>
              <p className="mt-5 max-w-[520px] text-[14.5px] leading-[1.55] text-[#3f4653]">
                Configure your agents, data sources, and preferences. Infi runs research against
                ACP-compatible agents on your machine.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5 lg:flex-nowrap">
                {AGENT_FEATURES.map(({ label, icon: Icon }) => (
                  <span
                    key={label}
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[5px] border border-[#dde6f2] bg-white/75 px-3 text-[12px] font-medium text-[#1c2430]"
                  >
                    <Icon size={17} weight="duotone" className="text-[#155dff]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-5 space-y-5">
            <section className="space-y-5">
              <SectionHeader
                number="01"
                label="Agents"
                title="Local ACP agents"
                meta={
                  <span className="tabular-nums">
                    {String(agents.length).padStart(2, "0")} detected
                  </span>
                }
              />
              <p className="max-w-[60ch] text-[14px] leading-[1.6] text-[#3f4653]">
                If an agent is marked unavailable, check your PATH or the documented environment
                overrides (
                <code className="rounded-[4px] bg-[#f0f0ef] px-1.5 py-0.5 font-mono text-[13px]">
                  CODEX_ACP_BIN
                </code>
                ,{" "}
                <code className="rounded-[4px] bg-[#f0f0ef] px-1.5 py-0.5 font-mono text-[13px]">
                  INFI_CUSTOM_AGENT
                </code>
                ).
              </p>
              <AgentStatusList agents={agents} />
            </section>

            <section className="space-y-6">
              <SectionHeader number="02" label="Preferences" title="Overrides" />
              {error && <div className="text-sm text-destructive">{error}</div>}
              {!settings ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="relative overflow-hidden rounded-[10px] border border-[#e7e9ee] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
                  <div className="px-5 py-6">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Eyebrow>Custom ACP command</Eyebrow>
                        <Input
                          className="bg-transparent font-mono text-[13px]"
                          value={settings.custom_agent_command || ""}
                          onChange={(event) =>
                            setLocalSettings({
                              ...settings,
                              custom_agent_command: event.target.value || null,
                            })
                          }
                          placeholder="e.g. /usr/local/bin/my-agent"
                        />
                        <p className="max-w-[60ch] text-[12.5px] leading-relaxed text-muted-foreground">
                          Absolute path to a custom ACP agent binary. Leave blank to rely on
                          autodiscovery.
                        </p>
                      </div>

                      <div className="border-t border-[#e7e9ee] pt-5">
                        <button
                          type="button"
                          onClick={save}
                          className="group inline-flex items-center gap-2 rounded-[6px] border border-[#155dff] bg-[#155dff] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#0d4ad6]"
                        >
                          <span>{saved || "Save settings"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <DataSourcesSection />
          </div>
        </div>
      </div>
    </div>
  );
}

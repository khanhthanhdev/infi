import { getSettings, updateSettings } from "@/shared/api/commands";

/**
 * Persist a model-by-agent mapping into user settings.
 * Null/undefined values are stripped before saving.
 * Silently ignores failures (non-critical side effect).
 */
export async function persistModelByAgent(map: Record<string, string | null>): Promise<void> {
  try {
    const settings = await getSettings();
    const next: Record<string, string> = {};
    for (const [id, value] of Object.entries(map)) {
      if (value) next[id] = value;
    }
    await updateSettings({ ...settings, model_by_agent: next });
  } catch {
    // non-critical
  }
}

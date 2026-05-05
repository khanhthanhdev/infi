export function getLogoPath(agentName: string) {
  const lower = agentName.toLowerCase();
  if (lower.includes("claude")) return "/icons/claude.svg";
  if (lower.includes("gemini")) return "/icons/gemini.svg";
  if (lower.includes("codex")) return "/icons/codex.svg";
  if (lower.includes("qwen")) return "/icons/qwen.svg";
  if (lower.includes("kimi")) return "/icons/kimi.svg";
  if (lower.includes("mistral")) return "/icons/mistral.svg";
  if (lower.includes("grok")) return "/icons/grok.svg";
  if (lower.includes("copilot")) return "/icons/copilot.svg";
  if (lower.includes("kiro")) return "/icons/kiro.svg";
  if (lower.includes("auggie")) return "/icons/auggie.svg";
  if (lower.includes("junie")) return "/icons/junie.svg";
  if (lower.includes("goose")) return "/icons/goose.svg";
  return "/icons/opencode.svg";
}

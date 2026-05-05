import type { MetricExplanation } from "@/types";

/**
 * Build a Map from target_key → MetricExplanation for O(1) lookups.
 * Use this in components that perform multiple explanation lookups
 * instead of calling find() on the raw array each time.
 */
export function buildExplanationLookup(
  explanations: MetricExplanation[],
): Map<string, MetricExplanation> {
  return new Map(explanations.map((e) => [e.target_key, e]));
}

/**
 * Normalize a metric name or key into a stable lookup key.
 * Lowercases, replaces non-alphanumeric characters with underscores,
 * and trims leading/trailing underscores.
 */
export function normalizeExplanationKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

import features from "@/config/features.json";

export type FeatureKey = keyof typeof features;

export function hasFeature(key: FeatureKey): boolean {
  return Boolean((features as Record<string, unknown>)[key]);
}

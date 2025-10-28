import type { ReactNode } from "react";
import { hasFeature, type FeatureKey } from "@/lib/featureFlags";

export default function FeatureGate({
  feature,
  children,
  fallback = null,
}: {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return hasFeature(feature) ? <>{children}</> : <>{fallback}</>;
}

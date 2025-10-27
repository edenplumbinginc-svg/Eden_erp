/** Centralized, white-label brand config (local overrides via VITE_... envs) */
export const ERP_NAME       = import.meta.env.VITE_BRAND_ERP_NAME       ?? 'OpsOS';
export const MODULE_NAME    = import.meta.env.VITE_BRAND_MODULE_NAME    ?? 'Synapse';
export const INSTANCE_LABEL = import.meta.env.VITE_BRAND_INSTANCE_LABEL ?? 'EDEN OPS';
export const LOGO_URL       = new URL('../assets/eden-mep-logo.png', import.meta.url).href;

/** Optional sizing tokens for header use */
export const BRAND_TOKENS = {
  headerH: 64,   // px
  logoH:   32,   // px
  icon:    20,   // px
  gap:     24,   // px
  btnH:    36,   // px
};

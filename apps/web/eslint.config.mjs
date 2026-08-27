import nextConfig from 'eslint-config-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// Next 16's eslint-config-next ships a native flat config (no more
// `next lint` CLI, no FlatCompat bridging needed) that already registers
// the jsx-a11y *plugin* internally — registering it again via
// `jsxA11y.flatConfigs.recommended` directly throws "Cannot redefine
// plugin." Applying just its `rules` object avoids that conflict while
// still layering in the full ~30-rule recommended set (Gate 7's
// accessibility hardening) on top of whatever narrower subset
// eslint-config-next applies by default.
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...nextConfig,
  { rules: jsxA11y.flatConfigs.recommended.rules },
];

export default config;

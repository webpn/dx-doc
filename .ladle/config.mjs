/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: 'src/**/*.stories.{js,jsx,ts,tsx,mdx}',
  // Workbench-only Vite config; see .ladle/vite.config.mjs for why the root
  // config cannot be autodetected.
  viteConfig: '.ladle/vite.config.mjs',
  addons: {
    a11y: {
      enabled: true,
    },
    width: {
      enabled: true,
    },
  },
};

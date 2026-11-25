// Scoped so it cannot restyle the tea room: no preflight, every utility only applies inside #sado-selector.
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  important: '#sado-selector',
  corePlugins: { preflight: false, container: false },
  theme: { extend: {} },
  plugins: [],
};

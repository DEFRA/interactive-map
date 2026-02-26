// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Interactive Map',
  tagline: 'An accessibility-first interactive map component for government frontends',
  favicon: 'img/favicon.ico',

  url: 'https://defra.github.io',
  baseUrl: '/interactive-map/',

  organizationName: 'defra',
  projectName: 'interactive-map',
  deploymentBranch: 'main',
  trailingSlash: false,
  
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [],

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        // docs-only mode: routeBasePath is '/'
        docsRouteBasePath: '/',
        indexBlog: false,
        indexPages: false,
        // hashed filenames for long-term caching of the search index
        hashed: 'filename',
        highlightSearchTermsOnTargetPage: true,
        searchResultContextMaxLength: 60,
      }),
    ],
    '@defra/docusaurus-theme-govuk',
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        routeBasePath: '/',
        editUrl: 'https://github.com/DEFRA/interactive-map/tree/main/',
      },
    ],
  ],

  themeConfig: {
    // Required by @docusaurus/plugin-content-docs when not using preset-classic.
    // easyops SearchBarWrapper calls useThemeConfig().docs.versionPersistence
    // during SSR; without this it throws "Cannot read properties of undefined".
    docs: {
      versionPersistence: 'localStorage',
    },
    govuk: {
      header: {
        serviceName: 'Interactive Map',
        serviceHref: '/',
        organisationText: 'Defra DDTS',
        organisationHref: 'https://github.com/defra',
      },

      navigation: [
        { text: 'Getting Started', href: '/getting-started' },
        {
          text: 'Architecture',
          href: '/architecture',
          sidebar: [
            { text: 'Overview', href: '/architecture' },
            { text: 'Diagrams', href: 'architecture-diagrams' },
            { text: 'Diagram Viewer', href: 'diagrams-viewer' },
          ],
        },
        { text: 'GOV.UK Prototype', href: '/govuk-prototype' },
        {
          text: 'API',
          href: '/api',
          sidebar: 'auto',
        },
        {
          text: 'Plugins',
          href: '/plugins',
          sidebar: [
            { text: 'Overview', href: '/plugins' },
            { text: 'Building a Plugin', href: '/building-a-plugin' },
            {
              text: 'Available Plugins',
              href: '/plugins#available-plugins',
              items: [
                { text: 'Interact', href: '/plugins#interact' },
                { text: 'Map Styles', href: '/plugins#map-styles' },
                { text: 'Scale Bar', href: '/plugins#scale-bar' },
                { text: 'Search', href: '/plugins#search' },
              ],
            },
            {
              text: 'Alpha Plugins',
              href: '/plugins#alpha-plugins',
              items: [
                { text: 'Datasets', href: '/plugins#datasets' },
                { text: 'Draw for MapLibre', href: '/plugins#draw-for-maplibre' },
                { text: 'Draw for ESRI SDK', href: '/plugins#draw-for-esri-sdk' },
                { text: 'Frame', href: '/plugins#frame' },
                { text: 'Use Location', href: '/plugins#use-location' },
              ],
            },
          ],
        },
      ],

      phaseBanner: {
        phase: 'alpha',
        text: 'This is a new frontend component. Help us improve it and give your feedback on Slack.',
      },

      footer: {
        meta: [
          { text: 'GitHub', href: 'https://github.com/DEFRA/interactive-map' },
        ],
      },

      homepage: {
        getStartedHref: '/getting-started',
        description: 'A lightweight, accessible map component for public-facing government services. Open source, multi-engine, and extendable through plugins.',
      },
    },
  },
};

module.exports = config;

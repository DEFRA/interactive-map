// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  staticDirectories: ['assets', 'docs/assets'],
  title: 'Defra Interactive Map',
  tagline: 'An accessibility-first interactive map component for government frontends',
  favicon: 'images/favicon.svg',

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
    function customCssPlugin() {
      return {
        name: 'custom-css',
        getClientModules() {
          return [require.resolve('./docs/assets/css/docusaurus.css')];
        },
      };
    },
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
        {
          text: 'Getting Started',
          href: '/getting-started',
          sidebar: [
            { text: 'Installation', href: '/getting-started#installation' },
            { text: 'GOV.UK Prototype kit', href: '/getting-started#govuk-prototype-kit' },
            { text: 'Manual setup', href: '/getting-started#manual-setup' },
            { text: 'Basic usage', href: '/getting-started#basic-usage' },
            { text: 'Using plugins', href: '/getting-started#using-plugins' }
          ],
        },
        {
          text: 'Examples',
          href: '/examples',
          sidebar: [
            { text: 'Basic map', href: '/examples/basic-map' },
            { text: 'Button-triggered map', href: '/examples/button-map' },
            { text: 'Add a marker with a panel', href: '/examples/add-marker-with-panel' },
            { text: 'Toggle marker label on click', href: '/examples/toggle-marker-label' },
          ],
        },
        {
          text: 'API',
          href: '/api',
          sidebar: 'auto',
        },
        {
          text: 'Plugins',
          href: '/plugins',
          sidebar: [
            // { text: 'Overview', href: '/plugins' },
            // { text: 'Building a Plugin', href: '/building-a-plugin' },
            { text: 'Available Plugins', href: '/plugins#available-plugins' },
            { text: 'Coming soon', href: '/plugins#coming-soon' },
            { text: 'Using plugins', href: '/plugins#using-plugins' },
            { text: 'Plugin events', href: '/plugins#plugin-events' },
            { text: 'Plugin methods', href: '/plugins#plugin-methods' },
            { text: 'Further reading', href: '/plugins#further-reading' },
          ],
        },
        {
          text: 'Architecture',
          href: '/architecture',
          sidebar: [
            { text: 'Diagrams', href: 'architecture-diagrams' },
            { text: 'Diagram Viewer', href: 'diagrams-viewer' },
          ],
        }
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
        description: 'Built for developers creating public-facing services on GOV.UK. Takes care of the hard work of building an accessible, standards-compliant mapping interface, so you can focus on your data.',
      },
    },
  },
};

module.exports = config;

// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Interactive Map',
  tagline: 'Accessibility-first interactive map component for government frontends ',
  favicon: 'img/favicon.ico',

  url: 'https://defra.github.io',
  baseUrl: '/interactive-map/',

  organizationName: 'defra',
  projectName: 'interactive-map',
  deploymentBranch: 'main',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [],

  themes: ['@defra/docusaurus-theme-govuk'],

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
          sidebar: [
            { text: 'Overview', href: '/api' },
            { text: 'Button Definition', href: 'button-definition' },
            { text: 'Context', href: 'context' },
            { text: 'Control Definition', href: 'control-definition' },
            { text: 'Icon Definition', href: 'icon-definition' },
            { text: 'Map Style Config', href: 'map-style-config' },
            { text: 'Marker Config', href: 'marker-config' },
            { text: 'Panel Definition', href: 'panel-definition' },
            { text: 'Slots', href: 'slots' },
          ],
        },
        {
          text: 'Plugins',
          href: '/plugins',
          sidebar: [
            { text: 'Overview', href: '/plugins' },
            { text: 'Building a Plugin', href: '/building-a-plugin' },
            { text: 'Interact', href: 'interact' },
            { text: 'Map Styles', href: 'map-styles' },
            { text: 'Plugin Context', href: 'plugin-context' },
            { text: 'Plugin Descriptor', href: 'plugin-descriptor' },
            { text: 'Plugin Manifest', href: 'plugin-manifest' },
            { text: 'Scale Bar', href: 'scale-bar' },
            { text: 'Search', href: 'search' },
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
    },
  },
};

module.exports = config;

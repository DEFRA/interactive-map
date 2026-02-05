// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'index',
      label: 'Introduction',
    },
    {
      type: 'doc',
      id: 'getting-started',
      label: 'Getting Started',
    },
    {
      type: 'doc',
      id: 'govuk-prototype',
      label: 'GOV.UK Prototype',
    },
    {
      type: 'doc',
      id: 'architecture',
      label: 'Architecture',
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api',
        {
          type: 'category',
          label: 'API Details',
          items: [
            'api/button-definition',
            'api/context',
            'api/control-definition',
            'api/icon-definition',
            'api/map-style-config',
            'api/marker-config',
            'api/panel-definition',
            'api/slots',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Plugins',
      items: [
        'plugins',
        'building-a-plugin',
        {
          type: 'category',
          label: 'Plugin Details',
          items: [
            'plugins/interact',
            'plugins/map-styles',
            'plugins/plugin-context',
            'plugins/plugin-descriptor',
            'plugins/plugin-manifest',
            'plugins/scale-bar',
            'plugins/search',
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;

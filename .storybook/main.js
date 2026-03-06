import path from 'path'

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  stories: ['../stories/**/*.stories.@(js|jsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  webpackFinal: async (config) => {
    // Transpile JSX in both .js and .jsx story files via babel-loader.
    // Storybook's react preset configures babel-loader for the framework
    // source, but stories outside src/ may not be covered.
    config.module.rules.push({
      test: /\.(js|jsx)$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: [
            ['@babel/preset-env', { targets: { chrome: 90 } }],
            ['@babel/preset-react', { runtime: 'automatic' }]
          ]
        }
      }
    })

    // Add SCSS support. Uses style-loader (injects into DOM) rather than
    // MiniCssExtractPlugin (which writes separate files for production builds).
    config.module.rules.push({
      test: /\.s[ac]ss$/i,
      use: ['style-loader', 'css-loader', 'sass-loader']
    })

    // Deduplicate modules that have nested copies inside maplibre dependencies.
    // Mirrors the alias block in webpack.dev.mjs.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@turf/meta': path.resolve(process.cwd(), 'node_modules/@turf/meta'),
      '@turf/helpers': path.resolve(process.cwd(), 'node_modules/@turf/helpers'),
      'robust-predicates': path.resolve(process.cwd(), 'node_modules/robust-predicates')
    }

    return config
  }
}

export default config

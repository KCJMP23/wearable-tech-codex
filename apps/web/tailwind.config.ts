import type { Config } from 'tailwindcss';
const uiConfig = require('../../packages/ui/tailwind.config.js');

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      ...uiConfig.theme.extend,
      colors: {
        ...uiConfig.theme.extend.colors,
        woodstock: {
          sand: '#F1E8D4',
          bloom: '#F29F80',
          dusk: '#5A4B81',
          forest: '#2F4530'
        }
      },
      fontFamily: {
        display: ['"General Sans"', 'system-ui'],
        body: ['"Inter"', 'system-ui']
      }
    }
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};

export default config;

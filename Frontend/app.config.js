const { config: loadEnv } = require('dotenv');

loadEnv();

const baseConfig = require('./app.json');

module.exports = ({ config }) => {
  const baseExpoConfig = baseConfig.expo ?? {};
  const incomingExpoConfig = config?.expo ?? {};

  return {
    ...baseConfig,
    expo: {
      ...baseExpoConfig,
      ...incomingExpoConfig,
      extra: {
        ...(baseExpoConfig.extra ?? {}),
        ...(incomingExpoConfig.extra ?? {}),
        apiBaseUrl: process.env.API_BASE_URL || 'http://3.37.114.206:8080',
      },
    },
  };
};

// Environment Configuration Service
// This file handles environment variables and API keys

// For development, you can set these values directly
// For production, use environment variables or secure storage

const ENV = {
  development: {
    GOOGLE_MAPS_API_KEY: 'your_google_maps_api_key_here',
    GOOGLE_SERVICES_API_KEY: 'your_google_services_api_key_here',
    API_BASE_URL: 'https://react-native-lessons-api-production.up.railway.app',
  },
  production: {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'your_production_key_here',
    GOOGLE_SERVICES_API_KEY: process.env.GOOGLE_SERVICES_API_KEY || 'your_production_key_here',
    API_BASE_URL: process.env.API_BASE_URL || 'https://react-native-lessons-api-production.up.railway.app',
  },
};

// Get current environment
const getEnvironment = () => {
  // In React Native, you can check for production builds
  if (__DEV__) {
    return 'development';
  }
  return 'production';
};

// Get configuration for current environment
export const getConfig = () => {
  const env = getEnvironment();
  return ENV[env];
};

// Individual getters for specific values
export const getGoogleMapsApiKey = () => getConfig().GOOGLE_MAPS_API_KEY;
export const getGoogleServicesApiKey = () => getConfig().GOOGLE_SERVICES_API_KEY;
export const getApiBaseUrl = () => getConfig().API_BASE_URL;

// Export default config
export default getConfig();

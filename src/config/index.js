const config = {
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT) || 3000,
  },
  environment: process.env.NODE_ENV || 'development'
};

export default config;
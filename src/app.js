const fastify = require('fastify')({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

const start = async () => {
  try {
    await fastify.register(require('./routes'));
    
    const host = process.env.HOST || '0.0.0.0';
    const port = process.env.PORT || 3000;
    
    await fastify.listen({ host, port });
    fastify.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
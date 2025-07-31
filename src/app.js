import dotenv from 'dotenv';
dotenv.config();
console.log('Environment variables loaded:', process.env.NODE_ENV);
import Fastify from 'fastify';

const fastify = Fastify({
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
    const routesModule = await import('./routes/index.js');
    await fastify.register(routesModule.default);
    
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
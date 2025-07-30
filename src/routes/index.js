const RestaurantService = require('../services/restaurantService');

async function routes(fastify, options) {
  const restaurantService = new RestaurantService(fastify.log);

  fastify.get('/', async (request, reply) => {
    return { 
      message: 'Welcome to Fastify API!',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  });

  fastify.get('/health', async (request, reply) => {
    return { 
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  });

  fastify.post('/restaurant/details', {
    schema: {
      body: {
        type: 'object',
        required: ['restaurantName'],
        properties: {
          restaurantName: {
            type: 'string',
            minLength: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { restaurantName } = request.body;
      const result = restaurantService.getRestaurantDetails(restaurantName);
      
      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error('Error getting restaurant details', { error: error.message });
      reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });
}

module.exports = routes;
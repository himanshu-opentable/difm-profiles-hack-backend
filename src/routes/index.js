import RestaurantService from '../services/restaurantService.js';

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

  fastify.get('/restaurant', {
    schema: {
      querystring: {
        type: 'object',
        required: ['name', 'location'],
        properties: {
          name: {
            type: 'string',
            minLength: 1
          },
          location: {
            type: 'string',
            minLength: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { name, location } = request.query;
      const result = await restaurantService.getRestaurantDetails(name, location);

      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error('Error getting restaurant details', { error: error.message });
      reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  fastify.post('/restaurant', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'address'],
        properties: {
          name: {
            type: 'string',
            minLength: 1
          },
          address: {
            type: 'object',
            properties: {
              address1: { type: 'string', minLength: 1 },
              city: { type: 'string', minLength: 1 },
              province: { type: 'string', minLength: 1 },
              postalCode: { type: 'string', minLength: 1 },
              country: { type: 'string', minLength: 1 }
            }
          },
          website: {
            type: 'string',
            format: 'uri',
            minLength: 1
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { name, address, website } = request.body;
      // Concatenate address fields into a comma separated string
      const location = [
        address.address1,
        address.city,
        address.province,
        address.postalCode,
        address.country
      ].filter(Boolean).join(', ');

      const result = await restaurantService.getRestaurantDetails(name, location, website);

      reply.code(200).send(result);
    } catch (error) {
      fastify.log.error('Error getting restaurant details', { error: error.message });
      reply.code(400).send({
        success: false,
        error: error.message
      });
    }
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

export default routes;
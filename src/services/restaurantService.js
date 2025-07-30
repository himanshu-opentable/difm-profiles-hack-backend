class RestaurantService {
  constructor(logger) {
    this.logger = logger;
  }

  getRestaurantDetails(restaurantName) {
    if (!restaurantName || typeof restaurantName !== 'string') {
      this.logger.warn('Invalid restaurant name provided', { restaurantName });
      throw new Error('Restaurant name must be a non-empty string');
    }

    this.logger.info('Restaurant details requested', { 
      restaurantName: restaurantName.trim(),
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      restaurantName: restaurantName.trim(),
      message: 'Restaurant details logged successfully'
    };
  }
}

module.exports = RestaurantService;
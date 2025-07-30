const GooglePlacesClient = require('../clients/googlePlacesClient');

class RestaurantService {
  constructor(logger) {
    this.logger = logger;
    this.googlePlacesClient = new GooglePlacesClient();
  }

  async getRestaurantDetails(restaurantName, location = null) {
    if (!restaurantName || typeof restaurantName !== 'string') {
      this.logger.warn('Invalid restaurant name provided', { restaurantName });
      throw new Error('Restaurant name must be a non-empty string');
    }

    const trimmedName = restaurantName.trim();
    
    this.logger.info('Restaurant details requested', { 
      restaurantName: trimmedName,
      location: location,
      timestamp: new Date().toISOString()
    });

    try {
      // Fetch real data from Google Places API
      const restaurantData = await this.googlePlacesClient.findPlaceByName(trimmedName, location);
      
      if (!restaurantData) {
        this.logger.warn('Restaurant not found', { restaurantName: trimmedName });
        return {
          success: false,
          restaurantName: trimmedName,
          message: 'Restaurant not found',
          data: null
        };
      }

      this.logger.info('Restaurant details fetched successfully', { 
        restaurantName: trimmedName,
        restaurantId: restaurantData.id 
      });

      return {
        success: true,
        restaurantName: trimmedName,
        message: 'Restaurant details fetched successfully',
        data: restaurantData
      };
    } catch (error) {
      this.logger.error('Error fetching restaurant details', { 
        error: error.message,
        restaurantName: trimmedName 
      });
      
      // Fallback to mock data if API fails
      this.logger.info('Falling back to mock data');
      const mockData = require('../data/google-api-mock-response.json');
      
      return {
        success: true,
        restaurantName: trimmedName,
        message: 'Restaurant details fetched from mock data (API unavailable)',
        data: mockData
      };
    }
  }
}

module.exports = RestaurantService;
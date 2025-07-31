import GooglePlacesClient from '../clients/googlePlacesClient.js';
import { determineCuisines, mapPriceLevelToBucket, formatBusinessHours } from '../utils/utils.js';
import GeminiService from './geminiService.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import CrawlerService from './crawlerService.js';
import ImageService from './imageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Normalizes the raw Google Places API response into our desired application format.
 * @param {object} response - The raw restaurant data from Google API or mock file.
 * @returns {object} The normalized restaurant data.
 */
function normalizeGoogleApiResponse(response) {
  if (!response) return null;

  const { primaryCuisine, additionalCuisines } = determineCuisines(response.types || []);

  return {
    id: response.id,
    basicDetails: {
      contactNumber: response.internationalPhoneNumber || null,
      address: response.formattedAddress || null,
      primaryCuisine: primaryCuisine,
      additionalCuisines: additionalCuisines,
      website: response.websiteUri || null, // Updated from undefined
      typicalCheckAmount: mapPriceLevelToBucket(response.priceLevel) || null,
    },
    photos: response.photos || [],
    description: response.editorialSummary?.text, // Use Google's summary or a placeholder
    businessHours: formatBusinessHours(response.regularOpeningHours || []),
    reviews: response.reviews || []
  };
}


class RestaurantService {
  constructor(logger) {
    this.logger = logger;
    this.googlePlacesClient = null;
    this.geminiService = new GeminiService(logger);
    this.crawlerService = new CrawlerService(logger);
    this.imageService = new ImageService(logger);

    // Only instantiate the client if we're not in a development environment.
    if (process.env.NODE_ENV !== 'development') {
      this.googlePlacesClient = new GooglePlacesClient();
      this.logger.info('GooglePlacesClient initialized for non-dev environment.');
    }
  }

  async getRestaurantDetails(restaurantName, location, website) {
    if (!restaurantName || typeof restaurantName !== 'string') {
      this.logger.warn('Invalid restaurant name provided', { restaurantName });
      throw new Error('Restaurant name must be a non-empty string');
    }

    let rawRestaurantData;

    try {
      if (process.env.NODE_ENV === 'development') {
        // --- Development Mode: Load from mock file ---
        this.logger.info(`DEV MODE: Loading mock data for "${restaurantName}"`);
        const mockDataPath = join(__dirname, '..', 'data', 'google-api-mock-response.json');
        rawRestaurantData = JSON.parse(readFileSync(mockDataPath, 'utf8'));
      } else {
        // --- Production Mode: Fetch from Google Places API ---
        this.logger.info(`Fetching real data for "${restaurantName}" from Google Places API.`);
        rawRestaurantData = await this.googlePlacesClient.findRestaurant(`${restaurantName}, ${location}`);
      }

      if (!rawRestaurantData) {
        this.logger.warn('Restaurant not found', { restaurantName });
        return { success: false, message: 'Restaurant not found', data: null };
      }

      // Normalize the data, regardless of the source
      const normalizedData = normalizeGoogleApiResponse(rawRestaurantData);
      // Combine scraping and ranking images into a single function
      async function getScrapedAndRankedPhotos(website) {
        const scrapedImgUrls = await this.crawlerService.scrapeImageUrls(website);
        return await this.imageService.getRankedPhotos(scrapedImgUrls);
      }

      // Run getScrapedAndRankedPhotos and generateRestaurantDescription in parallel
      const [scrapedPhotos, description] = await Promise.all([
        getScrapedAndRankedPhotos.call(this, website),
        this.geminiService.generateRestaurantDescription(normalizedData, restaurantName)
      ]);
      this.logger.info('Restaurant details processed successfully', {
        restaurantName,
        restaurantId: normalizedData.id
      });


      // Exclude the 'reviews' key from normalizedData before returning
      const { reviews, photos, ...normalizedDataWithoutReviews } = normalizedData;
      return {
        success: true,
        message: 'Restaurant details fetched successfully',
        data: { ...normalizedDataWithoutReviews, description, photos: scrapedPhotos }
      };

    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      this.logger.error('Error fetching or processing restaurant details', {
        error: error.message,
        restaurantName
      });
      // Return a generic error response instead of falling back to mock data
      return { success: false, message: 'An error occurred while fetching restaurant details.', data: null };
    }
  }
}

export default RestaurantService;
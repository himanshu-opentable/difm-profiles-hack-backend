import axios from 'axios';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GooglePlacesClient {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (this.apiKey) {
      this.apiClient = axios.create({
        baseURL: 'https://places.googleapis.com/v1',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
        },

      });
    }
  }

  /**
   * Finds a restaurant and returns its detailed information using the new Places API (v1).
   * @param {string} restaurantName The name of the restaurant to search for.
   * @returns {Object|null} Normalized restaurant data or null if not found.
   */
  async findRestaurant(restaurantName) {
    // Skip API call if profile is 'dev'
    console.log(`Checking profile: ${process.env.PROFILE}`);
    if (process.env.NODE_ENV === 'dev' || process.env.PROFILE === 'dev') {
      console.log(`Profile is 'dev', returning mock data for "${restaurantName}"`);
      return await this.getMockData(restaurantName);
    }

    try {
      // 1. Find the Place ID using searchText
      const searchResponse = await this.apiClient.post('/places:searchText',
        { textQuery: restaurantName },
        { headers: { 'X-Goog-FieldMask': 'places.id' } } // Only ask for the ID
      );

      const places = searchResponse.data.places;
      if (!places || places.length === 0) {
        console.log(`No results found for "${restaurantName}"`);
        return null;
      }

      const placeId = places[0].id;

      // 2. Get rich details using the Place ID
      const fields = [
        'id', 'displayName', 'types', 'formattedAddress', 'internationalPhoneNumber',
        'regularOpeningHours', 'priceLevel', 'reviews', 'photos', 'websiteUri', 'editorialSummary'
      ];

      const detailsResponse = await this.apiClient.get(
        `/places/${placeId}`,
        { headers: { 'X-Goog-FieldMask': fields.join(',') } }
      );

      return this.normalizeApiResponse(detailsResponse.data);

    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error('Google Places API Error:', errorMessage);
      throw new Error(`Failed to fetch restaurant data: ${errorMessage}`);
    }
  }

  /**
   * Normalizes the raw API response into a cleaner format for the application.
   * @param {Object} placeData The raw data from the Place Details response.
   * @returns {Object} A clean, structured object.
   */
  normalizeApiResponse(placeData) {
    if (!placeData) return null;

    return {
      ...placeData,
      reviews: (placeData.reviews || []).slice(0, 5),
      photos: this.getPhotoUrls((placeData.photos || []).slice(0, 5)),
    };
  }

  /**
   * Constructs direct photo URLs from the photo objects.
   * @param {Array} photos The array of photo objects from the API.
   * @returns {Array} An array of photo URL strings.
   */
  getPhotoUrls(photos) {
    return photos.map(photo => {
      // The 'name' field is the reference needed for the URL
      const photoReference = photo.name;
      return `https://places.googleapis.com/v1/${photoReference}/media?maxHeightPx=1080&key=${this.apiKey}`;
    });
  }

  /**
   * Returns mock data from the JSON file for development purposes.
   * @param {string} restaurantName The name of the restaurant (for logging purposes).
   * @returns {Object} Normalized mock restaurant data.
   */
  async getMockData(restaurantName) {
    try {
      const mockDataPath = join(__dirname, '..', 'data', 'google-api-mock-response.json');
      const mockData = JSON.parse(readFileSync(mockDataPath, 'utf8'));
      return this.normalizeApiResponse(mockData);
    } catch (error) {
      console.error('Error loading mock data:', error.message);
      return null;
    }
  }
}

export default GooglePlacesClient;
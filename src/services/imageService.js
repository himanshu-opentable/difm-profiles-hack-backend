import axios from 'axios';

// For production, you would install and use a library like 'image-size'
// import imageSize from 'image-size';

class ImageService {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Fetches image dimensions and sorts them by resolution in descending order.
   * @param {string[]} imageUrls An array of image URLs to process.
   * @returns {Promise<object[]>} A promise that resolves to an array of ranked image objects.
   */
  async getRankedPhotos(imageUrls) {
    this.logger.info(`Ranking ${imageUrls.length} images by resolution.`);

    const imagePromises = imageUrls.map(url => this._getImageDimensions(url));
    const imagesWithDimensions = (await Promise.all(imagePromises)).filter(img => img !== null);

    // Sort by resolution (width * height) in descending order
    const sortedImages = imagesWithDimensions.sort((a, b) => b.resolution - a.resolution);

    return sortedImages;
  }

  /**
   * Helper to get the dimensions of a single image from its URL.
   */
  async _getImageDimensions(url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      
      // NOTE: This is a placeholder. A real implementation would require a library.
      // const dimensions = imageSize(response.data);
      const dimensions = this._getSimulatedDimensions(response.data);

      return {
        url,
        width: dimensions.width,
        height: dimensions.height,
        resolution: dimensions.width * dimensions.height,
      };
    } catch (error) {
      this.logger.error({ msg: `Could not process image at ${url}`, error: error.message });
      return null;
    }
  }

  // This is a placeholder because Node.js doesn't have a built-in way to get image dimensions.
  // For a real project, replace this with a library like 'image-size'.
  _getSimulatedDimensions(buffer) {
    this.logger.warn('Using simulated image dimensions. Use a library like `image-size` for production.');
    if (buffer.length > 500000) return { width: 1920, height: 1080 };
    if (buffer.length > 100000) return { width: 1280, height: 720 };
    return { width: 800, height: 600 };
  }
}

export default ImageService;
import axios from 'axios';
import * as cheerio from 'cheerio';

class CrawlerService {
  constructor(logger) {
    this.logger = logger;
    this.MAX_IMAGES = 10;
  }

  /**
   * Scrapes the main page and relevant child pages, prioritizing gallery/photo links.
   * @param {string} websiteUrl The root URL of the restaurant's website.
   * @returns {Promise<string[]>} A promise that resolves to an array of up to 10 unique image URLs.
   */
  async scrapeImageUrls(websiteUrl) {
    this.logger.info(`Starting prioritized crawl for images on ${websiteUrl}`);
    const visitedPages = new Set();
    const imageUrls = new Set();
    
    // --- Scrape the initial page ---
    const html = await this._fetchHtml(websiteUrl);
    if (!html) {
      this.logger.warn('Could not fetch the main page. Exiting crawl.');
      return [];
    }
    
    visitedPages.add(websiteUrl);
    const $ = cheerio.load(html);
    this._getImagesOnPage($, websiteUrl, imageUrls);
    
    // --- Find and prioritize links ---
    if (imageUrls.size < this.MAX_IMAGES) {
      const { highPriorityLinks, lowPriorityLinks } = this._findAndPrioritizeLinks($, websiteUrl);

      // Create a prioritized queue
      const pageQueue = [...highPriorityLinks, ...lowPriorityLinks];

      // --- Process the queue ---
      for (const urlToCrawl of pageQueue) {
        if (imageUrls.size >= this.MAX_IMAGES) break; // Stop if we have enough images
        if (visitedPages.has(urlToCrawl)) continue;

        const childHtml = await this._fetchHtml(urlToCrawl);
        if (childHtml) {
          visitedPages.add(urlToCrawl);
          const $child = cheerio.load(childHtml);
          this._getImagesOnPage($child, websiteUrl, imageUrls);
        }
      }
    }

    this.logger.info(`Crawler found ${imageUrls.size} images.`);
    return Array.from(imageUrls).slice(0, this.MAX_IMAGES);
  }

  async _fetchHtml(url) {
    try {
      const { data } = await axios.get(url, { timeout: 5000 });
      return data;
    } catch (error) {
      this.logger.error({ msg: `Failed to fetch HTML from ${url}`, error: error.message });
      return null;
    }
  }

  _getImagesOnPage($, baseUrl, imageUrlsSet) {
    $('img').each((i, el) => {
      if (imageUrlsSet.size >= this.MAX_IMAGES) return false;

      let src = $(el).attr('src');
      if (src && !src.startsWith('data:') && !src.includes('.svg')) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          imageUrlsSet.add(absoluteUrl);
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    });
  }

  /**
   * Finds all relevant links on a page and sorts them into high and low priority.
   */
  _findAndPrioritizeLinks($, baseUrl) {
    const highPriorityLinks = new Set();
    const lowPriorityLinks = new Set();
    const highPriorityKeywords = ['gallery', 'photos'];
    const lowPriorityKeywords = ['menu', 'restaurant', 'space', 'about'];

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          const linkText = $(el).text().toLowerCase();

          // Only consider links on the same domain
          if (absoluteUrl.startsWith(baseUrl)) {
            const hasHighPriorityKeyword = highPriorityKeywords.some(keyword => linkText.includes(keyword) || absoluteUrl.includes(keyword));
            const hasLowPriorityKeyword = lowPriorityKeywords.some(keyword => linkText.includes(keyword) || absoluteUrl.includes(keyword));

            if (hasHighPriorityKeyword) {
              highPriorityLinks.add(absoluteUrl);
            } else if (hasLowPriorityKeyword) {
              lowPriorityLinks.add(absoluteUrl);
            }
          }
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    });

    return { 
      highPriorityLinks: Array.from(highPriorityLinks), 
      lowPriorityLinks: Array.from(lowPriorityLinks)
    };
  }
}

export default CrawlerService;
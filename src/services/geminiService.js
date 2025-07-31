// services/geminiService.js

import { GoogleGenAI } from "@google/genai";
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class GeminiService {
  constructor(logger) {
    this.promptTemplate = null;
    this._initializePromptTemplate();
    this.logger = logger;
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    // Initialize the client as per the new reference style
    this.ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
  }

  async _initializePromptTemplate() {
    const promptsPath = join(__dirname, '..', 'config', 'restaurantDesc.json');
    const promptsData = JSON.parse(readFileSync(promptsPath, 'utf8'));
    this.promptTemplate = promptsData;
  }

/**
 * Builds a dynamic, highly detailed prompt for the Gemini API.
 * @param {object} restaurantData - The normalized data object for the restaurant.
 * @param {string} restaurantName - The name of the restaurant.
 * @returns {string} The final, populated prompt string.
 */
_buildPrompt(restaurantData, restaurantName) {
  // Make the research instruction more direct.
  return this.promptTemplate.prompt.replace('{{website}}', restaurantData.basicDetails.website || restaurantName)
}

  /**
   * Generates a restaurant description using the exact pattern for the @google/genai library.
   * @param {object} restaurantData - The data object for the restaurant.
   * @param {string} restaurantName - The name of the restaurant.
   */
  async generateRestaurantDescription(restaurantData, restaurantName) {
    if (!this.promptTemplate) {
      await this._initializePromptTemplate();
    }
    const prompt = this._buildPrompt(restaurantData, restaurantName);
    this.logger.info('Sending prompt to Gemini API via @google/genai...');

    // Define the grounding tool
    const groundingTool = {
      googleSearch: {},
    };

    // Define the configuration object
    const config = {
      tools: [groundingTool]
    };
    
    try {
      // Make the request using the ai.models.generateContent pattern, which is correct for this library
      const result = await this.ai.models.generateContent({
        model: "gemini-2.5-flash", // This model name should still work
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config,
      });

      // The response structure for this library might be slightly different
      const description = result.text.trim();

      if (!description) {
        throw new Error('Gemini returned an empty description.');
      }
      
      this.logger.info('Successfully generated description.');
      return description;

    } catch (error) {
      this.logger.error({ error: error.message }, 'Error calling Gemini API');
      throw new Error('Failed to generate restaurant description via Gemini.');
    }
  }
}

export default GeminiService;
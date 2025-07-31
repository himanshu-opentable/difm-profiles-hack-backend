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
    const promptsPath = join(__dirname, '..', 'config', 'prompts.json');
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
  // Extract the text from the top 3 reviews to provide rich context.
  const reviewHighlights = restaurantData.reviews
    .slice(0, 3) // Take the first 3 reviews
    .map(review => `- "${review.text.text}"`) // Format each review text
    .join('\n'); // Join them with newlines

  // Make the research instruction more direct.
  let populatedResearchInstruction = this.promptTemplate.generateRestaurantDescription.steps[0].instruction
    .replace('{{name}}', restaurantName)
    .replace('{{location}}', restaurantData.basicDetails.address);

  // Combine all parts into a final, more robust prompt.
  return `
    ${this.promptTemplate.generateRestaurantDescription.task}

    ${this.promptTemplate.generateRestaurantDescription.steps[0].title}:
    ${populatedResearchInstruction}
    You must use your web search tool to find this information.

    ${this.promptTemplate.generateRestaurantDescription.steps[1].title}:
    ${this.promptTemplate.generateRestaurantDescription.steps[1].instruction}

    **Provided Core Data:**
    - Restaurant Name: ${restaurantName}
    - Primary Cuisine: ${restaurantData.basicDetails.primaryCuisine}
    - Address: ${restaurantData.basicDetails.address}
    - Highlights from User Reviews (use these to understand atmosphere and popular dishes):
    ${reviewHighlights}

    **Guidelines:**
    - Hook: ${this.promptTemplate.generateRestaurantDescription.steps[1].guidelines.Hook}
    - Content: ${this.promptTemplate.generateRestaurantDescription.steps[1].guidelines.Content}
    - Tone: ${this.promptTemplate.generateRestaurantDescription.steps[1].guidelines.Tone}
    - Length: ${this.promptTemplate.generateRestaurantDescription.steps[1].guidelines.Length}
    - Output: ${this.promptTemplate.generateRestaurantDescription.steps[1].guidelines.Output}
  `;
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
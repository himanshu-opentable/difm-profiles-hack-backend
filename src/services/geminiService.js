// services/geminiService.js

const { GoogleGenAI } = require("@google/genai");
const promptTemplate = require('../config/prompts.json').generateRestaurantDescription;

class GeminiService {
  constructor(logger) {
    this.logger = logger;
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    // Initialize the client as per the new reference style
    this.ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
  }

  /**
   * Builds the dynamic prompt from the template and details.
   * (This helper function remains the same)
   */
  _buildPrompt(restaurantData, restaurantName) {
    // This helper function remains the same
    let populatedResearchInstruction = promptTemplate.steps[0].instruction
      .replace('{{name}}', restaurantName)
      .replace('{{location}}', restaurantData.basicDetails.address);
      
    populatedResearchInstruction += " 4. The general atmosphere (e.g., fine-dining, casual, romantic). 5. Its most famous signature dishes.";

    return `
      ${promptTemplate.task}
      ${promptTemplate.steps[0].title}: ${populatedResearchInstruction}
      ${promptTemplate.steps[1].title}: ${promptTemplate.steps[1].instruction}
      **Provided Core Data:**
      - Restaurant Name: ${restaurantName}
      - Primary Cuisine: ${restaurantData.basicDetails.primaryCuisine}
      - Address: ${restaurantData.basicDetails.address}
      **Guidelines:**
      - Hook: ${promptTemplate.steps[1].guidelines.Hook}
      - Content: ${promptTemplate.steps[1].guidelines.Content}
      - Tone: ${promptTemplate.steps[1].guidelines.Tone}
      - Length: ${promptTemplate.steps[1].guidelines.Length}
      - Output: ${promptTemplate.steps[1].guidelines.Output}
    `;
  }

  /**
   * Generates a restaurant description using the exact pattern for the @google/genai library.
   * @param {object} restaurantData - The data object for the restaurant.
   * @param {string} restaurantName - The name of the restaurant.
   */
  async generateRestaurantDescription(restaurantData, restaurantName) {
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

module.exports = GeminiService;
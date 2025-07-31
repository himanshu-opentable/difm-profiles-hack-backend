// services/openAIService.js

const OpenAI = require('openai');
// Load all prompts from your configuration file
const prompts = require('../config/prompts.json');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI();
  }

  /**
   * Generates a restaurant description using a prompt from the config file.
   * @param {object} details - An object containing restaurant details.
   * @returns {string} The generated description text.
   */
  async generateRestaurantDescription(details) {
    // Get the prompt template from our loaded config
    const template = prompts.generateRestaurantDescription;
    
    // Replace placeholders with actual data
    let populatedPrompt = template.prompt
      .replace('{{name}}', details.name)
      .replace('{{primaryCuisine}}', details.primaryCuisine)
      .replace('{{additionalCuisines}}', details.additionalCuisines.join(', '))
      .replace('{{reviews}}', details.reviews.join('", "'));

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: template.system_role },
          { role: 'user', content: populatedPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const description = response.choices[0]?.message?.content?.trim();
      if (!description) {
        throw new Error('OpenAI returned an empty description.');
      }
      return description;

    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw new Error('Failed to generate restaurant description.');
    }
  }
}

module.exports = new OpenAIService();
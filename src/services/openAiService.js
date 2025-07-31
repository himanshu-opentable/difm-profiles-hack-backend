// services/openAIService.js

import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load all prompts from your configuration file

class OpenAIService {
  constructor() {
    this.openai = new OpenAI();
    this.prompts = null;
    this._initializePrompts();
  }

  async _initializePrompts() {
    const promptsPath = join(__dirname, '..', 'config', 'prompts.json');
    this.prompts = JSON.parse(readFileSync(promptsPath, 'utf8'));
  }

  /**
   * Generates a restaurant description using a prompt from the config file.
   * @param {object} details - An object containing restaurant details.
   * @returns {string} The generated description text.
   */
  async generateRestaurantDescription(details) {
    if (!this.prompts) {
      await this._initializePrompts();
    }
    // Get the prompt template from our loaded config
    const template = this.prompts.generateRestaurantDescription;
    
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

export default new OpenAIService();
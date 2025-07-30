/**
 * Determines the primary and additional cuisines from a Google Places 'types' array.
 * @param {string[]} googleTypes - The array of type strings from the Google Places API response.
 * @returns {{primaryCuisine: string|null, additionalCuisines: string[]}} An object with the determined cuisines.
 */
function determineCuisines(googleTypes) {
  const prioritizedCuisineMap = {
    // Specific National/Regional Cuisines
    'american_restaurant': 'American',
    'brazilian_restaurant': 'Brazilian',
    'chinese_restaurant': 'Chinese',
    'french_restaurant': 'French',
    'greek_restaurant': 'Greek',
    'indian_restaurant': 'Indian',
    'indonesian_restaurant': 'Indonesian',
    'italian_restaurant': 'Italian',
    'japanese_restaurant': 'Japanese',
    'korean_restaurant': 'Korean',
    'lebanese_restaurant': 'Lebanese',
    'mediterranean_restaurant': 'Mediterranean',
    'mexican_restaurant': 'Mexican',
    'middle_eastern_restaurant': 'Middle Eastern',
    'spanish_restaurant': 'Spanish',
    'thai_restaurant': 'Thai',
    'turkish_restaurant': 'Turkish',
    'vietnamese_restaurant': 'Vietnamese',
    'latin_american_restaurant': 'Latin American',
    // Specific Food Types
    'barbecue_restaurant': 'Barbecue',
    'pizza_restaurant': 'Pizza',
    'ramen_restaurant': 'Ramen',
    'sandwich_shop': 'Sandwiches',
    'seafood_restaurant': 'Seafood',
    'steak_house': 'Steakhouse',
    'sushi_restaurant': 'Sushi',
    'vegan_restaurant': 'Vegan',
    'vegetarian_restaurant': 'Vegetarian',
    // Meal-specific Types
    'breakfast_restaurant': 'Breakfast',
    'brunch_restaurant': 'Brunch',
    // General Establishment Types
    'bakery': 'Bakery',
    'bar': 'Bar',
    'cafe': 'Cafe',
    'pub': 'Pub',
  };

  let primaryCuisine = null;
  const additionalCuisines = [];

  // Get the keys of the map in their defined priority order
  const priorityOrder = Object.keys(prioritizedCuisineMap);

  for (const googleType of priorityOrder) {
    // Check if the input array from Google includes a type from our map
    if (googleTypes.includes(googleType)) {
      const cuisine = prioritizedCuisineMap[googleType];

      if (!primaryCuisine) {
        // The first match from our priority list becomes the primary cuisine
        primaryCuisine = cuisine;
      } else {
        // All subsequent matches are added to the additional cuisines array
        additionalCuisines.push(cuisine);
      }
    }
  }

  return { primaryCuisine, additionalCuisines };
}

/**
 * Maps the Google Places API v1 priceLevel string to a specific restaurant price bucket.
 * * Google's v1 price levels are strings:
 * - PRICE_LEVEL_FREE
 * - PRICE_LEVEL_INEXPENSIVE
 * - PRICE_LEVEL_MODERATE
 * - PRICE_LEVEL_EXPENSIVE
 * - PRICE_LEVEL_VERY_EXPENSIVE
 *
 * @param {string | null | undefined} priceLevel - The string price level from the Google Places API v1.
 * @returns {string | null} The corresponding price bucket string or null if the input is invalid.
 */
function mapPriceLevelToBucket(priceLevel) {
  // Return null if the input is not a valid string
  if (typeof priceLevel !== 'string' || !priceLevel) {
    return null;
  }

  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '$30 and under ($$)';

    case 'PRICE_LEVEL_MODERATE':
      return '$31 - $50 ($$$)';

    case 'PRICE_LEVEL_EXPENSIVE':
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '$50 and over ($$$$)';

    default:
      return null;
  }
}
/**
 * Formats a time object from Google Places API into a 12-hour AM/PM string.
 * @param {{hour: number, minute: number}} timeObj - The time object.
 * @returns {string} The formatted time string (e.g., "10AM", "5:30PM").
 */
function formatTime(timeObj) {
  const { hour, minute } = timeObj;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12; // Converts 0 or 12 to 12
  const displayMinute = minute === 0 ? '' : `:${String(minute).padStart(2, '0')}`;
  return `${displayHour}${displayMinute}${period}`;
}

/**
 * Converts Google Places regularOpeningHours into a simplified weekly schedule.
 * @param {object | null | undefined} openingHours - The regularOpeningHours object from Google Places API.
 * @returns {Array<{weekDay: string, timeSlots: string[]}>} A 7-day array with formatted business hours.
 */
function formatBusinessHours(openingHours) {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Initialize a structure to hold slots for each day, indexed 0-6
  const dailyHours = weekdays.map(() => []);

  // Return an empty schedule if periods data is missing
  if (!openingHours?.periods) {
    return weekdays.map(day => ({ weekDay: day, timeSlots: [] }));
  }

  // Process each period and assign it to the correct opening day
  for (const period of openingHours.periods) {
    const openDayIndex = period.open.day;
    const openTime = formatTime(period.open);
    const closeTime = formatTime(period.close);
    const timeSlot = `${openTime}-${closeTime}`;

    // Add the formatted time slot to the corresponding day's array
    if (dailyHours[openDayIndex]) {
      dailyHours[openDayIndex].push(timeSlot);
    }
  }

  // Map the processed daily hours to the final desired output format
  return weekdays.map((day, index) => ({
    weekDay: day,
    timeSlots: dailyHours[index],
  }));
}


module.exports = {
  determineCuisines,
  mapPriceLevelToBucket,
  formatBusinessHours
};
const axios = require('axios');

class GooglePlacesService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
  }

  /**
   * Fetch place details including reviews from Google Places API
   * @param {string} placeId - The Google Place ID
   * @param {string} fields - Comma-separated list of fields to return
   * @returns {Promise<Object>} Place details with reviews
   */
  async getPlaceDetails(placeId, fields = 'name,rating,reviews') {
    try {
      const url = `${this.baseUrl}/details/json`;
      const params = {
        place_id: placeId,
        fields: fields,
        key: this.apiKey
      };

      console.log(`Fetching place details for place_id: ${placeId}`);
      
      const response = await axios.get(url, { params });
      
      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Error fetching place details:', error.message);
      throw error;
    }
  }

  /**
   * Transform Google Places review data to our database format
   * @param {Object} placeData - Place data from Google Places API
   * @returns {Array} Array of transformed review objects
   */
  transformReviews(placeData) {
    if (!placeData.reviews || !Array.isArray(placeData.reviews)) {
      return [];
    }

    return placeData.reviews.map(review => {
      // Create a new object with all the original review fields
      const reviewData = { ...review };
      
      // Add place information
      reviewData.placeId = placeData.place_id || 'unknown';
      reviewData.placeName = placeData.name || 'Unknown Place';
      
      // Add our required fields
      reviewData.source = 'maps';
      reviewData.state = 'unfiltered';
      
      return reviewData;
    });
  }

  /**
   * Fetch and transform reviews for a specific place
   * @param {string} placeId - The Google Place ID
   * @returns {Promise<Array>} Array of transformed review objects
   */
  async fetchReviews(placeId) {
    try {
      const placeData = await this.getPlaceDetails(placeId, 'name,rating,reviews,place_id');
      return this.transformReviews(placeData);
    } catch (error) {
      console.error(`Error fetching reviews for place ${placeId}:`, error.message);
      throw error;
    }
  }
}

module.exports = GooglePlacesService;

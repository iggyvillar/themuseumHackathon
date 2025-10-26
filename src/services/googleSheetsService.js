const { google } = require('googleapis');
const fs = require('fs');

class GoogleSheetsService {
  constructor(apiKey, credentialsPath, sheetId) {
    this.apiKey = apiKey;
    this.credentialsPath = credentialsPath;
    this.sheetId = sheetId;
    this.sheets = null;
    this.auth = null;
  }

  /**
   * Initialize Google Sheets API authentication
   */
  async initialize() {
    try {
      if (this.credentialsPath && fs.existsSync(this.credentialsPath)) {
        // Use service account credentials
        this.auth = new google.auth.GoogleAuth({
          keyFile: this.credentialsPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });
        console.log('✅ Google Sheets service account authentication initialized');
      } else if (this.apiKey) {
        // Use API key (limited access)
        this.auth = this.apiKey;
        console.log('✅ Google Sheets API key authentication initialized');
      } else {
        throw new Error('No Google Sheets authentication method provided');
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    } catch (error) {
      console.error('❌ Error initializing Google Sheets service:', error.message);
      throw error;
    }
  }

  /**
   * Fetch data from Google Sheet
   * @param {string} range - Sheet range (e.g., "Form Responses 1!A2:Z")
   * @returns {Promise<Array>} Array of rows
   */
  async getSheetData(range = 'Form Responses 1!A2:Z') {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      console.log(`Fetching data from sheet ${this.sheetId}, range: ${range}`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: range
      });

      const rows = response.data.values || [];
      console.log(`✅ Fetched ${rows.length} rows from Google Sheet`);

      return rows;
    } catch (error) {
      console.error('Error fetching sheet data:', error.message);
      throw error;
    }
  }

  /**
   * Transform Google Sheets data to review format
   * @param {Array} rows - Raw sheet data
   * @param {Object} columnMapping - Mapping of column indices to field names
   * @returns {Array} Array of transformed review objects
   */
  transformSheetDataToReviews(rows, columnMapping = {}) {
    if (!rows || rows.length === 0) {
      return [];
    }

    // Default column mapping (adjust based on your form structure)
    const defaultMapping = {
      timestamp: 0,      // Column A - Timestamp
      name: 1,           // Column B - Name/Author
      email: 2,          // Column C - Email
      rating: 3,         // Column D - Rating
      text: 4,           // Column E - Review Text/Feedback
      placeName: 5,      // Column F - Place Name (optional)
      ...columnMapping
    };

    return rows.map((row, index) => {
      const review = {
        // Extract data based on column mapping
        author_name: row[defaultMapping.name] || `Anonymous User ${index + 1}`,
        author_url: null, // Not available in forms
        profile_photo_url: null, // Not available in forms
        rating: this.parseRating(row[defaultMapping.rating]),
        text: row[defaultMapping.text] || '',
        time: this.parseTimestamp(row[defaultMapping.timestamp]),
        relative_time_description: this.getRelativeTime(row[defaultMapping.timestamp]),
        
        // Add our required fields
        source: 'sheets',
        state: 'unfiltered',
        
        // Additional metadata
        placeId: 'google-form', // Generic ID for form responses
        placeName: row[defaultMapping.placeName] || 'Form Response',
        
        // Store original form data
        formData: {
          timestamp: row[defaultMapping.timestamp],
          email: row[defaultMapping.email],
          originalRow: row
        }
      };

      return review;
    });
  }

  /**
   * Parse rating from various formats
   * @param {string} ratingStr - Rating string
   * @returns {number} Parsed rating (1-5)
   */
  parseRating(ratingStr) {
    if (!ratingStr) return null;
    
    const rating = parseFloat(ratingStr);
    if (isNaN(rating)) return null;
    
    // Ensure rating is between 1-5
    return Math.max(1, Math.min(5, Math.round(rating)));
  }

  /**
   * Parse timestamp from various formats
   * @param {string} timestampStr - Timestamp string
   * @returns {number} Unix timestamp
   */
  parseTimestamp(timestampStr) {
    if (!timestampStr) return Date.now();
    
    try {
      const date = new Date(timestampStr);
      return date.getTime();
    } catch (error) {
      console.warn(`Could not parse timestamp: ${timestampStr}`);
      return Date.now();
    }
  }

  /**
   * Get relative time description
   * @param {string} timestampStr - Timestamp string
   * @returns {string} Relative time description
   */
  getRelativeTime(timestampStr) {
    if (!timestampStr) return 'Unknown time';
    
    try {
      const date = new Date(timestampStr);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch (error) {
      return 'Unknown time';
    }
  }

  /**
   * Fetch and transform reviews from Google Sheet
   * @param {string} range - Sheet range
   * @param {Object} columnMapping - Column mapping
   * @returns {Promise<Array>} Array of transformed review objects
   */
  async fetchReviews(range = 'Form Responses 1!A2:Z', columnMapping = {}) {
    try {
      const rows = await this.getSheetData(range);
      return this.transformSheetDataToReviews(rows, columnMapping);
    } catch (error) {
      console.error('Error fetching reviews from Google Sheet:', error.message);
      throw error;
    }
  }

  /**
   * Get sheet metadata
   * @returns {Promise<Object>} Sheet metadata
   */
  async getSheetMetadata() {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetId
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map(sheet => ({
          title: sheet.properties.title,
          sheetId: sheet.properties.sheetId,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount
        }))
      };
    } catch (error) {
      console.error('Error fetching sheet metadata:', error.message);
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;

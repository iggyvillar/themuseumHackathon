const OpenAI = require('openai');

class OpenAIService {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Analyze reviews and generate actionable tasks
   * @param {Array} reviews - Array of review objects
   * @returns {Promise<Array>} Array of task objects
   */
  async analyzeReviewsAndGenerateTasks(reviews) {
    try {
      console.log(`Analyzing ${reviews.length} reviews with OpenAI...`);

      // Prepare reviews for analysis
      const reviewsText = reviews.map((review, index) => {
        return `Review ${index + 1}:
- Author: ${review.author_name || 'Anonymous'}
- Rating: ${review.rating || 'N/A'}/5
- Source: ${review.source || 'Unknown'}
- Date: ${review.time ? new Date(review.time).toLocaleDateString() : 'Unknown'}
- Text: ${review.text || 'No text provided'}
- Review ID: ${review._id}
`;
      }).join('\n\n');

      const prompt = `You are an expert customer service analyst for THEMUSEUM. Analyze the following reviews and generate actionable tasks for the appropriate departments.

Available Departments:
- Finance & Administration: billing, refunds, accounting, HR issues
- Exhibitions: exhibit quality, displays, educational content, artifacts
- Facilities/Custodial: cleanliness, maintenance, repairs, parking, accessibility
- Marketing: online presence, promotions, signage, branding
- Programming: general programming issues
- Programming - Adult Programming: adult events and programs
- Programming - Camps: children's camps
- Programming - Education: school groups, educational programs
- Programming - THEMUSEUM Special Events: museum hosted special events
- Programming - The Underground Studio MakerSpace: makerspace activities
- Special Events: event planning and execution
- Development: donations, memberships, fundraising
- THESTORE: gift shop, merchandise, store staff
- Guest Services: front desk, customer service, wait times, staff friendliness
- Sales: general sales inquiries
- Sales - Third-Party Rentals: venue rentals for external parties
- Sales - Group Sales: group bookings and tours
- Sales - Weddings: wedding venue rentals
- Sales - Corporate Rentals: corporate event rentals

For each review that requires action, create a task with this JSON structure:

{
  "reviewId": "the MongoDB _id of the review",
  "title": "Clear, actionable task title (max 100 chars)",
  "description": "Detailed description including the review context and what needs to be done",
  "priority": "urgent" | "high" | "medium" | "low",
  "department": "exact department name from the list above",
  "tags": ["array", "of", "relevant", "tags"],
  "reasoning": "Why this task is needed and why assigned to this department"
}

Priority Guidelines:
- urgent: Critical issues, safety concerns, legal matters
- high: Negative reviews (1-2 stars), major complaints, service failures
- medium: Mixed reviews (3 stars), minor issues, suggestions for improvement
- low: Positive feedback that needs acknowledgment, minor suggestions

Department Selection Guidelines:
- Parking/building issues → Facilities/Custodial
- Staff rudeness/wait times → Guest Services
- Gift shop → THESTORE
- Event planning → Special Events or appropriate Sales subcategory
- Exhibit complaints → Exhibitions
- Kids programs → Programming - Camps or Programming - Education
- Cleanliness → Facilities/Custodial
- Website/social media → Marketing
- Billing/refunds → Finance & Administration
- Donations/membership → Development
- Makerspace activities → Programming - The Underground Studio MakerSpace

Only create tasks for reviews that genuinely need action. Positive reviews (4-5 stars) with no issues don't need tasks.

Return ONLY a valid JSON array of task objects. Do not include any other text.

Reviews to analyze:

${reviewsText}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a customer service expert who analyzes reviews and creates actionable tasks. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      console.log('OpenAI Response received');

      // Parse the response
      let tasksData;
      try {
        const parsed = JSON.parse(response);
        // Handle both direct array and object with tasks property
        tasksData = Array.isArray(parsed) ? parsed : (parsed.tasks || []);
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        // Try to extract JSON array from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          tasksData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse OpenAI response as JSON');
        }
      }

      console.log(`✅ Generated ${tasksData.length} tasks from AI analysis`);

      return tasksData;

    } catch (error) {
      console.error('Error analyzing reviews with OpenAI:', error.message);
      throw error;
    }
  }

  /**
   * Analyze a single review
   * @param {Object} review - Review object
   * @returns {Promise<Object|null>} Task object or null if no action needed
   */
  async analyzeSingleReview(review) {
    const tasks = await this.analyzeReviewsAndGenerateTasks([review]);
    return tasks.length > 0 ? tasks[0] : null;
  }

  /**
   * Get sentiment analysis for reviews
   * @param {Array} reviews - Array of review objects
   * @returns {Promise<Object>} Sentiment analysis summary
   */
  async getSentimentAnalysis(reviews) {
    try {
      const reviewsText = reviews.map((review, index) => 
        `Review ${index + 1}: Rating ${review.rating}/5 - ${review.text || 'No text'}`
      ).join('\n');

      const prompt = `Analyze the sentiment of these reviews and provide a summary in JSON format:

{
  "overall_sentiment": "positive" | "neutral" | "negative",
  "sentiment_score": 0-100,
  "key_themes": ["theme1", "theme2", "theme3"],
  "positive_aspects": ["aspect1", "aspect2"],
  "negative_aspects": ["aspect1", "aspect2"],
  "recommendations": ["recommendation1", "recommendation2"]
}

Reviews:
${reviewsText}`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a sentiment analysis expert. Respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
      console.error('Error getting sentiment analysis:', error.message);
      throw error;
    }
  }
}

module.exports = OpenAIService;


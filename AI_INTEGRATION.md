# 🤖 AI-Powered Review Analysis

The Museum API now includes OpenAI integration for intelligent review analysis and automatic task generation!

## 🎯 Overview

The AI integration analyzes reviews and automatically:
1. ✅ Identifies issues and opportunities
2. ✅ Generates actionable tasks
3. ✅ Assigns priority levels
4. ✅ Creates tasks in database
5. ✅ Sends tasks to ClickUp automatically

## 🚀 New Endpoints

### 1. Analyze Reviews & Generate Tasks

**POST** `/api/ai/analyze-reviews`

The main endpoint that does everything:
- Fetches reviews from database
- Sends to OpenAI for analysis
- Generates tasks based on AI recommendations
- Saves tasks to MongoDB
- Automatically sends to ClickUp

**Request:**
```json
{
  "filters": {
    "source": "maps",
    "state": "unfiltered",
    "minRating": 1,
    "maxRating": 3,
    "limit": 50
  },
  "sendToClickUp": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Analyzed 25 reviews and generated 8 tasks",
  "data": {
    "reviewsAnalyzed": 25,
    "tasksGenerated": 8,
    "tasksSaved": 8,
    "tasksSentToClickUp": 8,
    "tasks": [...],
    "clickupLinks": [
      {
        "taskId": "...",
        "clickupId": "...",
        "clickupUrl": "https://app.clickup.com/t/..."
      }
    ],
    "errors": []
  }
}
```

### 2. Get Sentiment Analysis

**POST** `/api/ai/sentiment`

Get overall sentiment analysis and key themes.

**Request:**
```json
{
  "filters": {
    "source": "maps"
  },
  "limit": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reviewsAnalyzed": 100,
    "analysis": {
      "overall_sentiment": "positive",
      "sentiment_score": 75,
      "key_themes": ["customer service", "cleanliness", "exhibits"],
      "positive_aspects": ["friendly staff", "educational"],
      "negative_aspects": ["parking", "wait times"],
      "recommendations": ["Improve parking signage", "Add more staff during peak hours"]
    }
  }
}
```

### 3. Analyze Single Review

**POST** `/api/ai/analyze-single`

Analyze one specific review.

**Request:**
```json
{
  "reviewId": "507f1f77bcf86cd799439011",
  "sendToClickUp": true
}
```

## 🔧 Setup

### 1. Environment Variable

The OpenAI API key is already configured in `.env`:
```env
OPENAI_API_KEY=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
```

### 2. Install Dependencies
```bash
npm install
```

The `openai` package is now included in dependencies.

### 3. Start Server
```bash
npm run dev
```

## 📊 How It Works

### Workflow

```
┌─────────────────┐
│  Reviews in DB  │
└────────┬────────┘
         │
         │ Fetch based on filters
         ▼
┌─────────────────┐
│   OpenAI API    │ ← Analyzes reviews with GPT-4
│   (GPT-4 Mini)  │   Identifies issues
└────────┬────────┘   Suggests actions
         │            Assigns priorities
         │
         │ Returns JSON tasks
         ▼
┌─────────────────┐
│  Save to Tasks  │ ← Creates Task documents
│   Collection    │   in MongoDB
└────────┬────────┘
         │
         │ Auto-send if enabled
         ▼
┌─────────────────┐
│   ClickUp API   │ ← Creates tasks in ClickUp
└─────────────────┘   Updates task status
```

### AI Task Generation Logic

The AI analyzes each review and:

**Priority Assignment:**
- 🔴 **Urgent**: Critical issues, safety concerns, legal matters
- 🟠 **High**: Negative reviews (1-2 stars), major complaints
- 🟡 **Medium**: Mixed reviews (3 stars), minor issues
- 🟢 **Low**: Positive feedback acknowledgment, minor suggestions

**Task Creation Criteria:**
- ✅ Creates tasks for negative feedback
- ✅ Creates tasks for complaints
- ✅ Creates tasks for improvement opportunities
- ❌ Skips positive reviews with no issues
- ❌ Skips generic positive feedback

## 💡 Usage Examples

### Example 1: Analyze All Negative Reviews

```bash
curl -X POST http://localhost:3000/api/ai/analyze-reviews \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "maxRating": 2,
      "state": "unfiltered"
    },
    "sendToClickUp": true
  }'
```

### Example 2: Analyze Recent Google Maps Reviews

```bash
curl -X POST http://localhost:3000/api/ai/analyze-reviews \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "source": "maps",
      "limit": 30
    },
    "sendToClickUp": true
  }'
```

### Example 3: Get Sentiment Analysis

```bash
curl -X POST http://localhost:3000/api/ai/sentiment \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "source": "maps"
    },
    "limit": 100
  }'
```

### Example 4: Analyze Specific Review

```bash
curl -X POST http://localhost:3000/api/ai/analyze-single \
  -H "Content-Type: application/json" \
  -d '{
    "reviewId": "507f1f77bcf86cd799439011",
    "sendToClickUp": true
  }'
```

## 🎨 Generated Task Format

Each AI-generated task includes:

```javascript
{
  reviewId: "507f1f77bcf86cd799439011",  // Links to review
  title: "Address complaint about wait times",
  description: "Customer reported 45-minute wait. Review and optimize entry process during peak hours.",
  priority: "high",
  tags: ["customer-service", "operations", "wait-times"],
  customFields: {
    aiReasoning: "Customer satisfaction issue that impacts overall experience",
    aiGenerated: true,
    generatedAt: "2025-01-26T..."
  },
  status: "sent",
  clickupTaskId: "abc123",
  clickupUrl: "https://app.clickup.com/t/abc123"
}
```

## 📈 Best Practices

### 1. Start with Negative Reviews
```json
{
  "filters": {
    "maxRating": 2,
    "state": "unfiltered"
  }
}
```

### 2. Process in Batches
Don't analyze too many at once (recommended: 50 max)

### 3. Review Before Sending
Set `sendToClickUp: false` initially to review tasks

### 4. Use Filters Strategically
- Filter by `state: "unfiltered"` for new reviews
- Filter by `source` to analyze specific channels
- Filter by rating range for targeted analysis

### 5. Monitor AI Quality
Check the `aiReasoning` field to understand AI decisions

## 🔍 Monitoring & Debugging

### Check OpenAI Status
```bash
curl http://localhost:3000/health
```

Look for:
```json
{
  "services": {
    "openai": "Configured"
  }
}
```

### Review AI-Generated Tasks
```bash
curl "http://localhost:3000/api/tasks?limit=10"
```

Filter for AI-generated tasks:
```javascript
tasks.filter(task => task.customFields?.aiGenerated === true)
```

## 💰 Cost Considerations

- Model: GPT-4o-mini (cost-effective)
- Average cost: ~$0.01-0.02 per 100 reviews
- Batch processing recommended for efficiency

## 🚨 Error Handling

The system handles errors gracefully:

1. **OpenAI Errors**: Logged, task not created
2. **ClickUp Errors**: Task saved but marked as failed
3. **Parsing Errors**: Attempts JSON extraction
4. **Individual Task Errors**: Continues processing others

## 🎯 Integration with Existing Workflow

### Complete Flow

1. **Fetch Reviews**
   ```bash
   POST /api/reviews/fetch
   POST /api/sheets/fetch
   ```

2. **AI Analysis** (NEW!)
   ```bash
   POST /api/ai/analyze-reviews
   ```

3. **Manual Review** (Optional)
   ```bash
   GET /api/tasks?status=pending
   ```

4. **Send to ClickUp**
   ```bash
   POST /api/tasks/:id/send
   # or
   POST /api/tasks/bulk/send
   ```

## 📚 Swagger Documentation

All AI endpoints are documented in Swagger UI:
```
http://localhost:3000/api-docs
```

Look for the **AI** tag with 3 endpoints:
- `/api/ai/analyze-reviews`
- `/api/ai/sentiment`
- `/api/ai/analyze-single`

## 🎉 Summary

The AI integration provides:
- ✅ Automated review analysis
- ✅ Intelligent task generation
- ✅ Priority assignment
- ✅ Automatic ClickUp integration
- ✅ Sentiment analysis
- ✅ Cost-effective processing
- ✅ Full error handling

**You can now process reviews → AI analysis → ClickUp tasks with a single API call!** 🚀


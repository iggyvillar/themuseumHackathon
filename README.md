# The Museum Review & Task Management API

A comprehensive Node.js backend service that fetches reviews from Google Maps and Google Sheets, stores them in MongoDB, enables 3rd party task creation, and syncs tasks to ClickUp.

## 🏗️ Architecture

```
Google Maps API ──┐
                  ├──> Reviews Collection (MongoDB) ──> Tasks Collection (MongoDB) ──> ClickUp
Google Sheets ────┘                                           ↑
                                                              │
                                                    3rd Party API Access
```

### Data Flow

1. **Review Collection**: Fetch reviews from Google Maps or Google Sheets
2. **Storage**: Store reviews in MongoDB with `source` and `state` metadata
3. **Task Creation**: 3rd party services can create tasks based on reviews
4. **ClickUp Sync**: Tasks are automatically or manually synced to ClickUp

## 🚀 Features

- ✅ Fetch reviews from Google Places API
- ✅ Fetch reviews from Google Sheets (Google Forms responses)
- ✅ Flexible MongoDB schema (auto-maps all fields)
- ✅ Task management system
- ✅ ClickUp integration
- ✅ RESTful API with Swagger documentation
- ✅ CORS enabled for cross-origin requests
- ✅ Request logging with Morgan
- ✅ Environment-based configuration

## 📁 Project Structure

```
themuseumHackathon/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   └── swagger.js            # Swagger/OpenAPI configuration
│   ├── models/
│   │   ├── Review.js             # Review schema (flexible)
│   │   └── Task.js               # Task schema
│   ├── services/
│   │   ├── googlePlacesService.js  # Google Places API integration
│   │   ├── googleSheetsService.js  # Google Sheets API integration
│   │   └── clickupService.js       # ClickUp API integration
│   ├── routes/
│   │   ├── reviews.js            # Review endpoints
│   │   ├── sheets.js             # Sheets endpoints
│   │   └── tasks.js              # Task endpoints
│   └── index.js                  # Main server file
├── .env                          # Environment variables
├── package.json
└── README.md
```

## 🔧 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create or update the `.env` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/themuseum
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/themuseum

# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
DEFAULT_PLACE_ID=ChIJ52t8jPL0K4gRX8TcXqzfMJQ

# Google Sheets Configuration
GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key_here
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
GOOGLE_SHEETS_RANGE=Form Responses 1!A2:Z

# ClickUp Integration
CLICKUP_API_KEY=your_clickup_api_key_here
CLICKUP_LIST_ID=your_clickup_list_id_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Google Places API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the "Places API"
4. Create credentials (API Key)
5. Copy the API key to your `.env` file

### 4. Google Sheets API Setup

#### Option A: Service Account (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Google Sheets API"
3. Create a Service Account
4. Download the JSON key file and save as `service-account.json`
5. Share your Google Sheet with the service account email
6. Set `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` in `.env`

#### Option B: API Key (Public sheets only)

1. Enable "Google Sheets API"
2. Create an API Key
3. Set `GOOGLE_SHEETS_API_KEY` in `.env`

### 5. ClickUp API Setup

1. Go to [ClickUp Settings](https://app.clickup.com/settings/apps)
2. Generate an API token
3. Create or find your List ID from ClickUp URL:
   ```
   https://app.clickup.com/LIST_ID/v/li/LIST_ID
                              ↑ this is your LIST_ID
   ```
4. Add to `.env`:
   ```env
   CLICKUP_API_KEY=pk_your_api_key_here
   CLICKUP_LIST_ID=123456789
   ```

### 6. Start MongoDB

```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
```

### 7. Run the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## 📚 API Documentation

### Interactive Documentation

Visit http://localhost:3000/api-docs for interactive Swagger UI documentation.

### Base URL

```
http://localhost:3000
```

## 🔗 API Endpoints

### Reviews (Google Places)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | `/api/reviews/fetch` | Fetch reviews from Google Places |
| GET | `/api/reviews` | Get all reviews |
| GET | `/api/reviews/:id` | Get specific review |
| PUT | `/api/reviews/:id` | Update review |
| DELETE | `/api/reviews/:id` | Delete review |

### Sheets (Google Forms/Sheets)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST/GET | `/api/sheets/fetch` | Fetch reviews from Google Sheets |
| GET | `/api/sheets/preview` | Preview sheet data (no save) |
| GET | `/api/sheets/metadata` | Get sheet information |
| GET | `/api/sheets/reviews` | Get sheet reviews from DB |

### Tasks (ClickUp Integration)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create a new task |
| GET | `/api/tasks` | Get all tasks |
| GET | `/api/tasks/:id` | Get specific task |
| POST | `/api/tasks/:id/send` | Send task to ClickUp |
| POST | `/api/tasks/bulk/send` | Send multiple tasks to ClickUp |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/api-docs` | Swagger documentation |

## 📝 Usage Examples

### 1. Fetch Reviews from Google Maps

```bash
# Using default place ID from .env
curl -X POST http://localhost:3000/api/reviews/fetch

# With custom place ID
curl -X POST http://localhost:3000/api/reviews/fetch \
  -H "Content-Type: application/json" \
  -d '{"placeId": "ChIJ52t8jPL0K4gRX8TcXqzfMJQ"}'
```

### 2. Fetch Reviews from Google Sheets

```bash
# Fetch all rows
curl -X GET "http://localhost:3000/api/sheets/fetch"

# Preview first 5 rows
curl "http://localhost:3000/api/sheets/preview?limit=5"
```

### 3. Create a Task (3rd Party API)

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "reviewId": "507f1f77bcf86cd799439011",
    "title": "Respond to negative review",
    "description": "Customer complained about service quality",
    "priority": "high",
    "sendToClickUp": true,
    "tags": ["customer-service", "urgent"]
  }'
```

### 4. Get All Tasks

```bash
# All tasks
curl "http://localhost:3000/api/tasks"

# Filter by status
curl "http://localhost:3000/api/tasks?status=pending"

# Tasks for specific review
curl "http://localhost:3000/api/tasks?reviewId=507f1f77bcf86cd799439011"
```

### 5. Send Task to ClickUp

```bash
curl -X POST "http://localhost:3000/api/tasks/507f1f77bcf86cd799439011/send"
```

### 6. Bulk Send Tasks

```bash
curl -X POST http://localhost:3000/api/tasks/bulk/send \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

## 🗂️ Data Models

### Review Model

```javascript
{
  source: "maps" | "sheets" | "other",     // Auto-added
  state: "unfiltered" | "filtered" | "processed",  // Auto-added
  placeId: String,
  placeName: String,
  author_name: String,
  rating: Number (1-5),
  text: String,
  time: Number (timestamp),
  // ... all other fields from API are stored automatically
  createdAt: Date,
  updatedAt: Date
}
```

### Task Model

```javascript
{
  reviewId: ObjectId,                      // Reference to review
  title: String,
  description: String,
  priority: "low" | "medium" | "high" | "urgent",
  status: "pending" | "sent" | "completed" | "failed",
  clickupTaskId: String,                   // Set after sending
  clickupUrl: String,
  assignee: String,
  dueDate: Date,
  tags: [String],
  errorMessage: String,                    // If failed
  retryCount: Number,
  sentAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔄 Typical Workflow

### For Review Management

1. **Fetch reviews from Google Maps**:
   ```bash
   curl -X POST http://localhost:3000/api/reviews/fetch
   ```

2. **Fetch reviews from Google Sheets**:
   ```bash
   curl -X GET http://localhost:3000/api/sheets/fetch
   ```

3. **View all reviews**:
   ```bash
   curl "http://localhost:3000/api/reviews?state=unfiltered"
   ```

### For Task Management (3rd Party Integration)

1. **3rd party creates tasks based on reviews**:
   ```javascript
   // Example: Create task for negative review
   POST /api/tasks
   {
     "reviewId": "...",
     "title": "Address customer complaint",
     "description": "Review text: ...",
     "priority": "high",
     "sendToClickUp": false  // Store first, send later
   }
   ```

2. **Review and send to ClickUp**:
   ```bash
   POST /api/tasks/{taskId}/send
   ```

3. **Or bulk send pending tasks**:
   ```bash
   POST /api/tasks/bulk/send
   ```

## 🛡️ Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 🔍 Health Check

Check system status and service configuration:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "database": "Connected",
  "services": {
    "googlePlaces": "Configured",
    "googleSheets": "Configured",
    "clickup": "Configured"
  }
}
```

## 🧪 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## 📦 Dependencies

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `axios` - HTTP client
- `googleapis` - Google APIs client
- `dotenv` - Environment variables
- `cors` - CORS middleware
- `morgan` - Request logger
- `swagger-ui-express` - API documentation
- `swagger-jsdoc` - Generate Swagger specs

## 🔐 Security Notes

1. Never commit `.env` file or `service-account.json`
2. Use environment variables for all sensitive data
3. Enable authentication for production (not included in base setup)
4. Restrict API keys to specific IPs/domains in production
5. Use MongoDB Atlas with IP whitelisting for production

## 🚀 Deployment

### Environment Variables for Production

Make sure to set all environment variables in your hosting platform:

- MongoDB Atlas connection string
- Google API keys
- ClickUp API key and list ID
- Set `NODE_ENV=production`

### Recommended Platforms

- **Backend**: Render, Railway, Heroku, AWS, DigitalOcean
- **Database**: MongoDB Atlas (free tier available)

## 📞 Support

For issues or questions, refer to:
- Swagger docs: http://localhost:3000/api-docs
- Health endpoint: http://localhost:3000/health

## 📄 License

ISC

---

Made with ❤️ for The Museum

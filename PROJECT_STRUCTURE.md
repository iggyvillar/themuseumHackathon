# The Museum API - Project Structure

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                                │
├──────────────────────┬──────────────────────────────────────────┤
│  Google Places API   │      Google Sheets API                   │
│  (Maps Reviews)      │      (Form Responses)                    │
└──────────┬───────────┴───────────────┬──────────────────────────┘
           │                           │
           │  fetch reviews            │  fetch reviews
           │                           │
┌──────────▼───────────────────────────▼──────────────────────────┐
│                    EXPRESS SERVER                                │
│                  (Node.js + Express)                             │
│                                                                  │
│  Middleware:                                                     │
│  - CORS                                                          │
│  - Morgan (logging)                                              │
│  - Body Parser                                                   │
│  - Swagger UI                                                    │
└──────────┬──────────────────────────┬────────────────────────────┘
           │                          │
           │  store with             │  query/create tasks
           │  source + state         │
           │                         │
┌──────────▼──────────┐    ┌─────────▼──────────┐
│  REVIEWS COLLECTION │    │  TASKS COLLECTION  │
│     (MongoDB)       │    │     (MongoDB)      │
│                     │    │                    │
│ Fields:             │    │ Fields:            │
│ - source: maps/     │    │ - reviewId (ref)   │
│   sheets            │    │ - title            │
│ - state: unfiltered/│    │ - description      │
│   filtered/         │    │ - priority         │
│   processed         │    │ - status           │
│ - placeId           │    │ - clickupTaskId    │
│ - author_name       │    │ - assignee         │
│ - rating            │    │ - dueDate          │
│ - text              │    │ - tags             │
│ - ... (flexible)    │    │                    │
└─────────────────────┘    └─────────┬──────────┘
                                     │
                            ┌────────▼──────────┐
                            │  3rd Party Access │
                            │  (REST API)       │
                            └────────┬──────────┘
                                     │
                            send tasks manually
                            or automatically
                                     │
                            ┌────────▼──────────┐
                            │   ClickUp API     │
                            │  (Task Management)│
                            └───────────────────┘
```

## 🗂️ File Structure

```
themuseumHackathon/
│
├── src/
│   ├── config/
│   │   ├── database.js              # MongoDB connection config
│   │   └── swagger.js                # Swagger/OpenAPI specs
│   │
│   ├── models/
│   │   ├── Review.js                 # Review schema (flexible, strict: false)
│   │   └── Task.js                   # Task schema with methods
│   │
│   ├── services/
│   │   ├── googlePlacesService.js    # Google Places API wrapper
│   │   ├── googleSheetsService.js    # Google Sheets API wrapper
│   │   └── clickupService.js         # ClickUp API wrapper
│   │
│   ├── routes/
│   │   ├── reviews.js                # Review endpoints (/api/reviews)
│   │   ├── sheets.js                 # Sheets endpoints (/api/sheets)
│   │   └── tasks.js                  # Task endpoints (/api/tasks)
│   │
│   └── index.js                      # Main server entry point
│
├── .env                              # Environment variables (not in git)
├── .gitignore                        # Git ignore file
├── service-account.json              # Google service account (not in git)
├── package.json                      # Dependencies
├── package-lock.json
├── README.md                         # Main documentation
└── PROJECT_STRUCTURE.md              # This file
```

## 🔄 Data Flow

### 1. Review Collection Flow

```
Google Maps/Sheets → API Service → Transform Data → Add Metadata → MongoDB
                                                    (source, state)
```

**Metadata Added:**
- `source`: "maps" or "sheets"
- `state`: "unfiltered" (default)
- `createdAt`, `updatedAt`: timestamps

### 2. Task Creation Flow

```
Review in DB → 3rd Party Creates Task → Task Stored in MongoDB
                                              ↓
                                       (pending status)
                                              ↓
                                       Manual/Auto Send
                                              ↓
                                        ClickUp API
                                              ↓
                                       Update Task Status
                                       (sent, with ClickUp ID)
```

## 🎯 Key Features

### Reviews Collection

1. **Multi-source Support**
   - Google Places API (maps)
   - Google Sheets API (sheets/forms)
   - Flexible for future sources

2. **Flexible Schema**
   - No rigid field definitions
   - Auto-stores all API fields
   - Always adds: `source`, `state`

3. **State Management**
   - `unfiltered`: newly fetched
   - `filtered`: processed/reviewed
   - `processed`: completed

### Task Management

1. **Task Storage**
   - Link to reviews (optional)
   - Priority levels
   - Status tracking
   - Error handling with retry count

2. **ClickUp Integration**
   - Create tasks
   - Update tasks
   - Sync status
   - Bulk operations

3. **3rd Party API**
   - RESTful endpoints
   - Create tasks programmatically
   - Query tasks
   - Flexible metadata

## 🔌 API Endpoints Overview

### Reviews (`/api/reviews`)
- Fetch from Google Places
- CRUD operations
- Filter by source/state

### Sheets (`/api/sheets`)
- Fetch from Google Sheets
- Preview without saving
- Get metadata

### Tasks (`/api/tasks`)
- Create tasks
- Link to reviews
- Send to ClickUp (single/bulk)
- Query and filter

### System
- `/` - API info
- `/health` - Health check
- `/api-docs` - Swagger UI

## 🔐 Environment Configuration

```env
# Database
MONGODB_URI=mongodb://localhost:27017/themuseum

# Google APIs
GOOGLE_PLACES_API_KEY=...
DEFAULT_PLACE_ID=...
GOOGLE_SHEETS_API_KEY=...
GOOGLE_SHEET_ID=...
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# ClickUp
CLICKUP_API_KEY=...
CLICKUP_LIST_ID=...

# Server
PORT=3000
NODE_ENV=development
```

## 📝 Typical Use Cases

### Use Case 1: Collect and Monitor Reviews

1. Fetch reviews from Google Maps
2. Fetch reviews from Google Forms
3. Reviews stored with `source` tag
4. Filter by `state` for processing

### Use Case 2: Task Assignment

1. 3rd party reviews database
2. Identifies issue (negative review)
3. Creates task via API
4. Task stored in MongoDB
5. Manual review/approval
6. Send to ClickUp

### Use Case 3: Automated Workflow

1. Scheduled job fetches reviews
2. Algorithm filters reviews
3. Auto-creates tasks for issues
4. Bulk send to ClickUp
5. Team receives assignments

## 🧩 Integration Points

### Inbound
- Google Places API
- Google Sheets API
- 3rd party task creation API

### Outbound
- ClickUp API
- MongoDB

### Middleware
- CORS (cross-origin)
- Morgan (logging)
- Swagger (docs)

## 🚀 Scalability Considerations

1. **Database Indexing**
   - Reviews: source, state, placeId
   - Tasks: status, reviewId, clickupTaskId

2. **API Rate Limiting**
   - Google APIs have quotas
   - ClickUp has rate limits
   - Implement retry logic

3. **Async Processing**
   - Bulk operations use batching
   - Error handling per item
   - Status tracking

4. **Caching** (Future)
   - Cache frequent queries
   - Reduce API calls

## 📚 Documentation

- **Swagger UI**: http://localhost:3000/api-docs
- **README**: Comprehensive setup guide
- **This File**: Architecture overview

---

This structure ensures:
- ✅ Clean separation of concerns
- ✅ Scalable architecture
- ✅ Easy maintenance
- ✅ Clear data flow
- ✅ Flexible integration


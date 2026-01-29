# Water Meters App - AI Coding Instructions

## Project Overview
**Water Meters Tracking Application** - A React + Vite web app for managing water meter readings across residential apartments. The system uses a dual-view architecture: Admin view for property management and Resident view for individual access to meter data.

- **Stack**: React 18, Vite, backend API (Node.js/Express with SQLite)
- **Language**: Latvian UI (property in Latvia)
- **Data Persistence**: SQLite database via REST API backend (supports multi-browser access)

## Architecture & Data Flow

### Core Components
1. **App.jsx** (root) - Route dispatcher based on URL query parameter (`?resident=ID`)
   - Loads residents from backend on mount
   - Initializes default data if none exists
   - Routes to AdminView (default) or ResidentView (single resident access)

2. **AdminView.jsx** - Property management dashboard
   - CRUD operations for residents (add/edit/delete)
   - Add/edit/delete meter readings for all apartments
   - Generate shareable resident links (copy-to-clipboard)
   - Expanded/collapsed meter reading history

3. **ResidentView.jsx** - Individual resident dashboard
   - Read-only view of own apartment data
   - Add new meter readings
   - Calculate water consumption between readings
   - Access controlled via unique resident ID in URL

### Data Model
```javascript
Resident {
  id: string              // Generated as: Date.now() + random
  name: string
  apartment: string       // e.g., "7-1", "7-4/5"
  email: string
  meters: number          // Count of meters in apartment
  meterIds: array         // Physical meter IDs (e.g., ["532576", "4001170"])
  readings: [             // Sorted newest-first
    {
      id: string
      date: "YYYY-MM-DD"
      meters: { 1: 123.45, 2: 456.78 }  // Key = meter number, Value = reading
      timestamp: number   // Date.now()
    }
  ]
}
```

### State Management & Storage Patterns
- **Local state**: Form inputs, UI toggles (showNewReading, expandedHistories)
- **Lifted state**: `residents` array in App.jsx, passed as props downward
- **Persistence**: `updateResidents()` callback triggers `saveData()` which syncs all residents to SQLite backend
- **Multi-browser sync**: All browsers fetch latest data on load; changes propagate via API calls to central SQLite database

## Key Workflows

### Adding a Meter Reading
1. Component calls `openAddReading(residentId)` → initializes meter input objects
2. Validates all meter fields filled (critical: different logic for single vs multiple meters)
3. Creates reading object with ID from `Date.now()` and user-provided date
4. Updates residents array and triggers `saveData()`

### Resident Access
- **No authentication**: Security by obscurity via unique ID in URL
- **Sharing**: Admin generates link via `generateResidentLink()` and copies to clipboard
- **Validation**: ResidentView checks if resident exists; shows error if ID invalid

### Consumption Calculation
- Function: `calculateConsumption(readings, meterCount)`
- Logic: `current_reading - previous_reading` per meter
- Returns: Individual meter consumption and total (sum of all meters)
- Used in both views to display usage data

## Important Code Patterns

### Meter Iteration
Since meters are stored as objects with numeric keys (1, 2, 3...):
```javascript
// Correct pattern used throughout:
for (let i = 1; i <= resident.meters; i++) {
  reading.meters[i] = parseFloat(newReading.meters[i]);
}
// Meter count is stored as NUMBER, not in the readings array length
```

### Date Handling
- Input: `new Date().toISOString().split('T')[0]` → "YYYY-MM-DD" string
- Sorting: `sort((a, b) => new Date(b.date) - new Date(a.date))` → newest first
- Always parse date strings when comparing

### Form Validation
- Check for empty strings: `!value || value === ''`
- Show alert in Latvian before preventing submission
- Example: `alert('Lūdzu, ievadiet visus skaitītāju rādījumus')`

### API Error Handling
- Network errors caught but logged only; no UI feedback (design intent)
- Falls back gracefully: cache used if API fails on load
- All errors in English in console for debugging

## Backend Integration
**API_URL**: Configurable via `VITE_API_URL` environment variable (defaults to `http://localhost:3001`)

**Backend Requirements**: Express.js server with SQLite database

**API Endpoints**:
- `GET /api/residents` - Fetch all residents with readings from SQLite
- `PUT /api/residents/:id` - Update resident (used for changes: readings, metadata)
- `POST /api/residents` - Create new resident
- `DELETE /api/residents/:id` - Delete resident
- `POST /api/residents/:id/readings` - Add reading
- `PUT /api/residents/:id/readings/:readingId` - Update reading
- `DELETE /api/residents/:id/readings/:readingId` - Delete reading

**Data Flow**: All state changes trigger API calls → SQLite persists → Next browser load fetches fresh data from database

## Common Tasks

### Adding a new field to Resident
1. Update [data/residents.js](data/residents.js) `INITIAL_RESIDENTS`
2. Update `initializeResidents()` in [utils/storage.js](utils/storage.js)
3. Update form inputs in AdminView and ResidentView
4. Update the map/spread operations that build updated objects

### Modifying meter readings logic
- Readings are immutable per meter (edit replaces entire reading object)
- Multiple meters handled via numeric-keyed object (not array)
- Always validate all meters filled before submission

### Styling
- Components have paired CSS files (e.g., AdminView.jsx + AdminView.css)
- Uses CSS Grid/Flexbox; no Tailwind
- Color scheme: Blue gradients (`#2c5f7c` to `#1a3a4d`)
- Icons from Lucide React (imported as needed)

## Testing & Debugging
- **No test framework configured**: Use manual testing in browser
- **API debugging**: Check network tab for API calls to `/api/residents`
- **Backend logs**: Monitor server logs for SQLite errors
- **Multi-browser testing**: Open app in 2+ browsers; changes in one should reflect in others after refresh
- **Fallback**: App initializes default residents if API returns null (useful for initial setup)

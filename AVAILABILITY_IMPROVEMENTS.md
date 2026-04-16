# Availability Page Improvements

## Overview
Updated the Availability management page to use intelligent dropdown selects and implement manager-to-location auto-filtering, replacing text inputs with a more user-friendly database-driven interface.

---

## Backend Changes

### File: `backend/src/services/availability.service.ts`

#### 1. **New Helper Function: `flattenAvailability()`**
- **Purpose**: Transforms nested relationship objects into flat field names matching frontend expectations
- **Transformation**:
  - `manager_rel.name` → `managerName`
  - `manager_rel.email` → `managerEmail`
  - `location_rel.name` → `location`

#### 2. **Three New API Service Methods**

**`getAllManagers()`**
- Returns all active managers (MANAGER and ADMIN roles)
- Used to populate the manager dropdown
- Returns: `[{ id, name, email }, ...]`

**`getManagerLocations(managerId)`**
- Returns all locations where a specific manager has availability slots
- Called when a manager is selected in the form
- Returns: `[{ id, name }, ...]` (unique locations only)

**`getAllLocations()`**
- Returns all active locations in the system
- Used as fallback for manual location selection
- Returns: `[{ id, name }, ...]`

#### 3. **Updated All Response Methods**
All response methods now apply `flattenAvailability()`:
- `listAvailability()`
- `getAvailabilityById()`
- `createAvailability()`
- `updateAvailability()`

---

### File: `backend/src/controllers/availability.controller.ts`

Added three new controller functions:
- `getAllManagers()` - Calls service and returns manager list
- `getManagerLocations(managerId)` - Calls service with manager ID parameter
- `getAllLocations()` - Calls service and returns location list

---

### File: `backend/src/routes/availability.ts`

Added three new GET routes:
```
GET /api/availability/managers/list         - Get all managers
GET /api/availability/managers/:managerId/locations - Get manager's locations
GET /api/availability/locations/list        - Get all locations
```

All routes are protected with `auth` and `rbac('HR')` middleware.

---

## Frontend Changes

### File: `frontend/src/api/index.js`

Added three new API methods to `availabilityApi`:
```javascript
getAllManagers()              // GET /managers/list
getManagerLocations(managerId) // GET /managers/:managerId/locations
getAllLocations()             // GET /locations/list
```

---

### File: `frontend/src/views/AvailabilityView.vue`

#### 1. **Modal Form - Complete Redesign**

**Manager Selection**
- Changed from text input to dropdown
- Displays manager name and email
- Format: "John Smith (john@example.com)"
- Triggers location loading when selected

**Location Selection**
- Changed from text input to dropdown
- **Auto-filtered** to show only locations where selected manager has availability
- **Auto-disables** when no manager is selected
- **Auto-selects** when only one location is available for the manager
- Shows helpful message: "Only location available for this manager"

**Time Inputs**
- Changed to HTML5 `type="time"` inputs (better UX)
- Renders as proper time pickers on most browsers
- Still accepts text input in 24-hour format

**Day & Duration**
- Organized into proper grid layout
- Both are now required fields (added validation)

#### 2. **New Reactive Data**

```javascript
managers: ref([])              // List of all managers
managerLocations: ref([])      // Filtered locations for selected manager
loading_dropdowns: ref(false)  // Loading state for API calls
```

#### 3. **New Functions**

**`loadDropdownData()`**
- Loads all managers when component mounts
- Called during `onMounted` hook

**`onManagerChange()`**
- Triggered when user selects a manager
- Fetches that manager's locations
- Auto-selects single location if available
- Clears location if no manager selected

#### 4. **Updated Form Structure**

```javascript
// OLD
{
  managerName: '',
  managerEmail: '',
  location: '',
  ...
}

// NEW
{
  managerId: '',      // Foreign key instead of name
  locationId: '',     // Foreign key instead of name
  ...
}
```

#### 5. **Enhanced saveModal() Function**

Now:
1. Looks up manager and location objects from IDs
2. Validates that both are selected
3. Transforms form data back to API format:
   ```javascript
   {
     managerName: manager.name,
     managerEmail: manager.email,
     location: location.name,
     dayOfWeek, startTime, endTime, slotDuration, active
   }
   ```
4. Submits transformed data to API

#### 6. **Updated openEdit() Function**

Now:
1. Finds the manager ID from the saved slot data
2. Loads that manager's locations
3. Auto-selects the correct location
4. Populates all form fields with correct values

---

## User Experience Improvements

### Before
- Text fields for manager name and email (prone to typos)
- Text field for location (inconsistent entries)
- Manual entry could create duplicates
- No validation of manager-location combinations

### After
- Dropdown lists ensure data consistency
- Manager selection auto-filters available locations
- Only valid manager-location combinations can be created
- Single location automatically selected (less clicks)
- Disabled inputs prevent invalid states
- Time inputs use native HTML5 pickers

---

## Data Flow

### Creating a New Availability Slot
```
User selects Manager (dropdown)
    ↓
onManagerChange() triggered
    ↓
API call: GET /managers/:managerId/locations
    ↓
managerLocations updated
    ↓
If 1 location: auto-select, disable dropdown
If >1 location: enable dropdown, clear selection
    ↓
User selects Location
    ↓
User fills Time, Day, Duration
    ↓
Save button clicked
    ↓
saveModal() transforms IDs to names
    ↓
API: POST /availability with manager name/email and location name
    ↓
Backend creates ManagerAvailability record
    ↓
Response flattened and returned
    ↓
UI updated with new slot
```

### Editing an Existing Slot
```
User clicks Edit on a slot
    ↓
openEdit() called with slot data
    ↓
Find manager from managerName + managerEmail
    ↓
Load that manager's locations
    ↓
Find and select the correct location ID
    ↓
Populate all form fields
    ↓
Show modal in edit mode
    ↓
(Same save flow as above)
```

---

## API Response Format

### Manager Object
```javascript
{
  id: "user-123",
  name: "Alice Smith",
  email: "alice@example.com"
}
```

### Location Object
```javascript
{
  id: "loc-456",
  name: "Berlin Office"
}
```

### Availability Response (Flattened)
```javascript
{
  id: "avail-789",
  managerId: "user-123",
  managerName: "Alice Smith",        // ← Flattened
  managerEmail: "alice@example.com", // ← Flattened
  locationId: "loc-456",
  location: "Berlin Office",         // ← Flattened
  dayOfWeek: "Monday",
  startTime: "09:00",
  endTime: "17:00",
  slotDuration: "20 Min",
  active: true,
  createdAt: "2024-04-16T10:00:00Z",
  updatedAt: "2024-04-16T10:00:00Z"
}
```

---

## Database Relationships Leveraged

1. **ManagerAvailability → User** (`manager_rel`)
   - Used to display and filter managers
   - Only shows managers who have availability slots

2. **ManagerAvailability → Location** (`location_rel`)
   - Used to show locations for a specific manager
   - Filtered by selected manager

3. **User Role Filter**
   - Only managers and admins appear in dropdown
   - Based on `role` field in User table

---

## Testing Checklist

- [ ] Load Availability page - managers dropdown populates correctly
- [ ] Select a manager - location dropdown updates with only that manager's locations
- [ ] Manager with 1 location - location auto-selects and disables
- [ ] Manager with multiple locations - location dropdown stays enabled
- [ ] Change manager - location dropdown clears and updates
- [ ] Fill time fields - accepts HH:MM format
- [ ] Create new slot - all data saves correctly
- [ ] Click Edit - form pre-populates with correct manager and location
- [ ] Update slot - changes persist
- [ ] Filter by location in list - still works correctly
- [ ] Mobile view - dropdowns are usable on mobile

---

## Future Enhancements

1. **Add manager search/filter** in dropdown (if many managers)
2. **Show manager availability summary** when selected
3. **Bulk availability creation** for multiple days/times
4. **Conflict detection** - warn if overlapping slots created
5. **Location-based view** - show all managers for a location
6. **Calendar visualization** of availability slots
7. **Manager preferences** - set preferred availability patterns
8. **Auto-suggestion** - recommend common time slots

---

## Technical Notes

- Form now uses IDs internally, transforms to names only at API boundary
- This pattern allows easy future addition of more dropdown fields
- Manager-location filtering is immediate (no debounce needed)
- Time picker uses HTML5 native when available, falls back to text input
- All API calls protected with auth middleware
- Maintains backward compatibility with existing backend responses

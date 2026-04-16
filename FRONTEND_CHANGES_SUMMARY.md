# Frontend Changes Summary - Candidate Page Update

## Overview
Updated the Candidate management page to leverage the new backend relationships (Posting, Location, HiringManager, Recruiter, and Appointment) added to the database schema.

---

## Backend Changes

### File: `backend/src/services/candidates.service.ts`

#### New Helper Function: `flattenCandidate()`
- **Purpose**: Transforms the nested relationship objects from Prisma into flattened field names that match frontend expectations
- **Transformation**:
  - `candidate.name` → `candidateName`
  - `candidate.posting_rel.name` → `postingName`
  - `candidate.location_rel.name` → `location`
  - `candidate.hiringManager_rel.name` → `hiringManager`
  - `candidate.recruiter_rel.name` → `recruiter`
- **Benefits**: Maintains backward compatibility while properly exposing all relationship data

#### Updated Service Methods
All query methods now:
1. Include `recruiter_rel` in the Prisma include statement (previously missing)
2. Include `appointment` relationship for displaying scheduled interviews
3. Apply `flattenCandidate()` to transform response data

**Modified Methods**:
- `listCandidates()` - Added recruiter, appointment, and flattening
- `getCandidateById()` - Added recruiter, appointment, and flattening
- `getCandidateByEmailId()` - Added recruiter, appointment, and flattening
- `createCandidate()` - Added recruiter, appointment, and flattening
- `updateCandidate()` - Added recruiter, appointment, and flattening
- `updateAIReview()` - Added includes and flattening
- `updateCallResult()` - Added includes and flattening

---

## Frontend Changes

### File: `frontend/src/views/CandidatesView.vue`

#### 1. **Candidate Table - New Column**
- Added "Hiring Manager" column to display the assigned hiring manager for each candidate
- Position: Between Location and Status columns
- Display: Shows hiring manager name or "—" if not assigned

#### 2. **Filter System - New Filter**
- Added "Filter by hiring manager…" input field
- Allows users to filter candidates by assigned hiring manager
- Integrated with existing filter logic (search debounce, active filters tracking, etc.)

#### 3. **Updated Filters Reactive Object**
```javascript
const filters = reactive({
  search: '',
  status: '',
  aiRecommendation: '',
  location: '',
  hiringManager: '',        // ← NEW
  sortBy: 'createdAt',
  sortOrder: 'desc',
})
```

#### 4. **Filter Logic Updates**
- Updated `hasActiveFilters` computed property to include `hiringManager`
- Updated `clearFilters()` function to reset `hiringManager`
- Updated `fetchData()` function to pass `hiringManager` to API

---

### File: `frontend/src/components/candidates/CandidateDrawer.vue`

#### 1. **Overview Tab - Enhanced Details Section**
Added new fields to display related data:
- **Position** - From `posting_rel`
- **Location** - From `location_rel`
- **Email** - New field display
- **Hiring Manager** - From `hiringManager_rel`
- **Recruiter** - From `recruiter_rel`
- **Date Applied** - Existing field
- **Date Added** - Reformatted display of `createdAt`

#### 2. **New Appointment Information Section**
- Displays scheduled appointment details if an appointment exists
- Shows:
  - Interview Date
  - Interview Location
  - Start Time
  - End Time
- Styled with blue background to distinguish from other candidate info

#### 3. **Edit Tab - Enhanced Form Fields**
New/updated form fields:
- **Email** (read-only) - Cannot be edited for data integrity
- **Resume URL** - New field for candidate resume links
- Reorganized layout:
  - Candidate Name (full width)
  - Email & Phone (side by side)
  - Position & Location (side by side)
  - Hiring Manager & Recruiter (side by side)
  - Date Applied & Status (side by side)
  - Resume URL (full width)

#### 4. **Edit Form State**
Updated the edit form object to include:
```javascript
const editForm = reactive({
  candidateName: '',
  phone: '',
  emailId: '',              // ← NEW
  postingName: '',
  location: '',
  hiringManager: '',
  recruiter: '',
  dateApplied: '',
  status: '',
  resumeUrl: '',            // ← NEW
})
```

#### 5. **Form Initialization**
Updated the `watch()` on candidate prop to populate new fields when drawer opens

---

## API Data Flow

### Before Changes
```
API Response → Frontend (expecting flattened data)
└─ Issue: Backend returned nested objects
```

### After Changes
```
Backend (nested objects) 
    ↓
flattenCandidate() transformer
    ↓
API Response (flattened fields)
    ↓
Frontend displays correctly
```

---

## Data Structure Example

### API Response (After Changes)
```javascript
{
  id: "candidate-123",
  name: "John Doe",                    // Raw field
  candidateName: "John Doe",           // Flattened
  emailId: "john@example.com",
  phone: "+49 123 456 789",
  status: "scheduled",
  dateApplied: "2024-03-15",
  resumeUrl: "https://example.com/resume.pdf",
  postingId: "posting-456",
  postingName: "Senior Developer",     // Flattened
  location: "Berlin",                  // Flattened
  hiringManager: "Alice Smith",        // Flattened
  recruiter: "Bob Johnson",            // Flattened
  appointment: {
    id: "apt-789",
    interviewDate: "2024-04-20",
    startTime: "10:00",
    endTime: "11:00",
    location_rel: { name: "Berlin Office" }
  },
  createdAt: "2024-03-10T14:30:00Z",
  updatedAt: "2024-04-16T09:15:00Z"
}
```

---

## Testing Checklist

- [ ] Verify candidates list loads with hiring manager column visible
- [ ] Test filtering by hiring manager name
- [ ] Click on candidate to open drawer
- [ ] Verify all related data displays in Overview tab:
  - Position
  - Location
  - Hiring Manager
  - Recruiter
  - Email
  - Date Applied/Added
- [ ] If appointment exists, verify appointment details section appears
- [ ] Edit candidate data and verify changes save correctly
- [ ] Verify email field is read-only in edit form
- [ ] Test adding/updating resume URL
- [ ] Verify filter combinations work (status + hiring manager, etc.)
- [ ] Test on mobile - new "Hiring Manager" column should be visible

---

## Database Relationships Used

The changes leverage these Prisma relationships from the schema:

1. **Candidate → Posting** (`posting_rel`)
   - Used to display position name

2. **Candidate → Location** (`location_rel`)
   - Used to display office location

3. **Candidate → User** (`hiringManager_rel`)
   - User assigned as hiring manager
   - Used for filtering and display

4. **Candidate → User** (`recruiter_rel`)
   - User assigned as recruiter
   - New relationship now properly exposed

5. **Candidate → Appointment** (one-to-one)
   - Interview scheduling information
   - Now displayed in drawer

---

## Backward Compatibility

✅ All changes are backward compatible:
- Frontend still works with flattened data structure
- API consumers receive the same data format as before
- No breaking changes to routes or response structure
- Null/undefined values handled gracefully with "—" fallback

---

## Next Steps (Optional Enhancements)

1. Add recruiter filter alongside hiring manager filter
2. Add appointment scheduling interface directly from candidate drawer
3. Add sorting by hiring manager column
4. Add batch assignment of hiring managers
5. Add recruiter assignment workflow
6. Add appointment details modal with edit capability

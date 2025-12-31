# myTime Extension - Test Cases

## 1. Domain Tracking Tests

### 1.1 Add Domain with Limits
**Steps:**
1. Open extension options page
2. Enter domain name: "youtube.com"
3. Set Daily Limit: 0.5 hours
4. Set Weekly Limit: 2 hours
5. Click "Add Domain"

**Expected:**
- Success message shown
- Domain appears in tracked domains table
- Daily and Weekly limits displayed correctly
- Status badge shows "ACTIVE"

### 1.2 Add Domain without Limits
**Steps:**
1. Open extension options page
2. Enter domain name: "github.com"
3. Leave both limits empty (or set to 0)
4. Click "Add Domain"

**Expected:**
- Success message shown
- Domain appears in tracked domains table
- Limits show "-"
- Status badge shows "UNLIMITED"
- Domain is tracked without any time restrictions

### 1.3 Add Invalid Domain
**Steps:**
1. Enter invalid domain: "not a domain"
2. Click "Add Domain"

**Expected:**
- Error message: "Please enter a valid domain name"
- Domain not added to list

### 1.4 Add Duplicate Domain
**Steps:**
1. Add domain "example.com"
2. Try to add "example.com" again

**Expected:**
- Error message about duplicate domain
- Only one entry in table

## 2. Limit Enforcement Tests

### 2.1 Daily Limit Exceeded
**Steps:**
1. Add domain with Daily Limit: 0.1 hours (6 minutes)
2. Visit the domain
3. Wait for 7 minutes of active usage

**Expected:**
- Domain gets blocked
- Blocker overlay appears on domain tabs
- Status badge shows "BLOCKED"
- Domain row highlighted in red

### 2.2 Weekly Limit Exceeded
**Steps:**
1. Add domain with Weekly Limit: 0.25 hours (15 minutes)
2. Visit the domain
3. Accumulate 16 minutes of usage

**Expected:**
- Domain gets blocked
- Status badge shows "BLOCKED"
- Blocker overlay shown

### 2.3 Increase Limit While Blocked
**Steps:**
1. Have a blocked domain (exceeded 0.5 hour daily limit)
2. Edit domain and increase Daily Limit to 2 hours
3. Click Save

**Expected:**
- Domain becomes unblocked
- Status badge changes from "BLOCKED" to "ACTIVE"
- Blocker overlay removed from tabs
- Row no longer highlighted in red

### 2.4 Approaching Limit Warning (90%)
**Steps:**
1. Add domain with Daily Limit: 1 hour
2. Use domain for 55 minutes

**Expected:**
- Warning notification shown
- Percentage shows in red (>= 90%)
- Domain not yet blocked

## 3. Pagination Tests

### 3.1 Pagination Display
**Steps:**
1. Add 25 domains
2. Set items per page to 20
3. View tracked domains table

**Expected:**
- Shows "Showing 1-20 of 25 domains"
- Page numbers 1-5 visible
- Next button enabled, Previous disabled

### 3.2 Navigate to Next Page
**Steps:**
1. Click "Next" button

**Expected:**
- Shows "Showing 21-25 of 25 domains"
- Current page is 2
- Previous button enabled, Next disabled
- Shows correct 5 domains

### 3.3 Navigate to Previous Page
**Steps:**
1. From page 2, click "Previous"

**Expected:**
- Shows "Showing 1-20 of 25 domains"
- Current page is 1
- Previous disabled, Next enabled

### 3.4 Click Page Number
**Steps:**
1. Have 100 domains
2. Click on page number "3"

**Expected:**
- Shows "Showing 41-60 of 100 domains"
- Page 3 is active (highlighted)
- Correct domains displayed

### 3.5 Change Items Per Page
**Steps:**
1. Have 50 domains
2. Change "Per page" from 20 to 50

**Expected:**
- Shows "Showing 1-50 of 50 domains"
- All domains visible on one page
- Pagination controls show only page 1

### 3.6 Table Height Consistency
**Steps:**
1. Have 100 domains (20 per page)
2. Navigate to last page (showing only 20 domains)

**Expected:**
- Table container maintains same height
- No layout shift or resizing
- Pagination stays in same position

## 4. Search and Filter Tests

### 4.1 Search by Domain Name
**Steps:**
1. Add domains: "youtube.com", "github.com", "google.com"
2. Type "you" in search box

**Expected:**
- Only "youtube.com" shown
- Shows "Showing 1-1 of 1 domains"
- Other domains hidden

### 4.2 Search with No Results
**Steps:**
1. Type "nonexistent" in search box

**Expected:**
- Shows "No domains found matching 'nonexistent'"
- Table hidden
- Pagination hidden

### 4.3 Filter by "With Limits"
**Steps:**
1. Add 3 domains with limits, 2 without
2. Select "With Limits" filter

**Expected:**
- Shows only 3 domains with limits
- "Showing 1-3 of 3 domains"

### 4.4 Filter by "Without Limits"
**Steps:**
1. Select "Without Limits" filter

**Expected:**
- Shows only domains with no limits
- Status badges all show "UNLIMITED"

### 4.5 Combined Search and Filter
**Steps:**
1. Select "With Limits" filter
2. Type "you" in search

**Expected:**
- Shows only domains with limits that match "you"
- Both filters applied correctly

## 5. Edit Domain Tests

### 5.1 Edit Domain Limits
**Steps:**
1. Click Edit on a domain
2. Change Daily Limit from 1 to 2 hours
3. Click Save

**Expected:**
- Modal closes
- Success message shown
- Table updates with new limits
- Percentage recalculated

### 5.2 Edit to Remove Limits
**Steps:**
1. Click Edit on domain with limits
2. Clear both Daily and Weekly limit fields (or set to 0)
3. Click Save

**Expected:**
- Success message shown
- Limits removed (set to null)
- Domain becomes "UNLIMITED"
- Domain continues to be tracked without limits

### 5.3 Cancel Edit
**Steps:**
1. Click Edit
2. Make changes
3. Click Cancel

**Expected:**
- Modal closes
- No changes applied
- Original values remain

## 6. Delete Domain Tests

### 6.1 Delete Domain
**Steps:**
1. Click Delete on a domain
2. Confirm deletion

**Expected:**
- Domain removed from table
- Success message shown
- Pagination updates if needed

## 7. Excluded Domains Tests

### 7.1 Add Excluded Domain
**Steps:**
1. Enter domain: "ads.example.com"
2. Click "Add to Exclusion List"

**Expected:**
- Domain added to excluded list
- Success message shown
- Domain will never be tracked

### 7.2 Add Tracked Domain to Exclusion
**Steps:**
1. Have "youtube.com" in tracked domains
2. Add "youtube.com" to exclusion list

**Expected:**
- Domain removed from tracked domains
- Domain added to excluded list
- Success message shown

### 7.3 Remove from Exclusion List
**Steps:**
1. Click delete on excluded domain

**Expected:**
- Domain removed from exclusion list
- Can be tracked again if visited

## 8. Settings Tests

### 8.1 Update Max Daily Extensions
**Steps:**
1. Go to Settings tab
2. Change Max Daily Extensions to 5
3. Click Save

**Expected:**
- Success message shown
- Setting saved
- Applies to all domains

### 8.2 Change Week Start Day
**Steps:**
1. Change "Week Starts On" to Sunday
2. Click Save

**Expected:**
- Weekly reset happens on Sunday
- Setting persisted

## 9. Extension Request Tests

### 9.1 Request Extension on Blocked Domain
**Steps:**
1. Domain is blocked
2. Click "Request Extension" on blocker
3. Select duration (30 minutes)

**Expected:**
- Extension granted
- Domain unblocked for 30 minutes
- Timer shown on blocker
- Extension count incremented

### 9.2 Exceed Max Extensions
**Steps:**
1. Request 3 daily extensions (max = 3)
2. Try to request 4th extension

**Expected:**
- Request denied
- Message: "Maximum daily extensions reached"

## 10. Data Management Tests

### 10.1 Export Data
**Steps:**
1. Click "Export Data"

**Expected:**
- JSON file downloaded
- Contains all domains, settings, extensions

### 10.2 Import Data
**Steps:**
1. Click "Import Data"
2. Select valid JSON file

**Expected:**
- Success message
- All data loaded
- UI updated

### 10.3 Weekly Reset
**Steps:**
1. Click "Manual Weekly Reset"

**Expected:**
- Weekly times reset to 0
- Daily times preserved
- Extensions reset

### 10.4 Reset All Data
**Steps:**
1. Click "Reset All Data"
2. Confirm

**Expected:**
- All domains deleted
- Settings reset to defaults
- Clean slate

## Test Results Log

| Test Case | Status | Date | Notes |
|-----------|--------|------|-------|
| 1.1 | ⬜ | - | - |
| 1.2 | ⬜ | - | - |
| 1.3 | ⬜ | - | - |
| 1.4 | ⬜ | - | - |
| 2.1 | ⬜ | - | - |
| 2.2 | ⬜ | - | - |
| 2.3 | ⬜ | - | - |
| 2.4 | ⬜ | - | - |
| 3.1 | ⬜ | - | - |
| 3.2 | ⬜ | - | - |
| 3.3 | ⬜ | - | - |
| 3.4 | ⬜ | - | - |
| 3.5 | ⬜ | - | - |
| 3.6 | ⬜ | - | - |
| 4.1 | ⬜ | - | - |
| 4.2 | ⬜ | - | - |
| 4.3 | ⬜ | - | - |
| 4.4 | ⬜ | - | - |
| 4.5 | ⬜ | - | - |
| 5.1 | ⬜ | - | - |
| 5.2 | ⬜ | - | - |
| 5.3 | ⬜ | - | - |
| 6.1 | ⬜ | - | - |
| 7.1 | ⬜ | - | - |
| 7.2 | ⬜ | - | - |
| 7.3 | ⬜ | - | - |
| 8.1 | ⬜ | - | - |
| 8.2 | ⬜ | - | - |
| 9.1 | ⬜ | - | - |
| 9.2 | ⬜ | - | - |
| 10.1 | ⬜ | - | - |
| 10.2 | ⬜ | - | - |
| 10.3 | ⬜ | - | - |
| 10.4 | ⬜ | - | - |

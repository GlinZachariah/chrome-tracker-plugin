# Daily + Weekly Limits Feature - Implementation Summary

## Changes Made

### 1. Data Schema Updates (`shared/constants.js`)

**Domain Data:**
```javascript
{
  totalTime: 0,
  weeklyTime: 0,
  dailyTime: 0,          // NEW
  lastUpdated: 0,
  lastDayReset: 0,       // NEW
  weeklyLimit: null,
  dailyLimit: null,      // NEW
  isBlocked: false
}
```

**Extension Data:**
```javascript
{
  weeklyRequests: [],
  dailyRequests: [],     // NEW
  currentExtension: null,
  lastDayReset: 0        // NEW
}
```

### 2. Utility Functions (`shared/utils.js`)

- `getTodayStart()` - Get midnight timestamp for today
- `isNewDay(timestamp)` - Check if timestamp is from different day

### 3. Storage Manager (`background/storage-manager.js`)

**Updated Methods:**
- `addDomainTime()` - Now tracks both daily and weekly time, auto-resets daily at midnight
- `performWeeklyReset()` - Also resets daily data
- `addExtensionRequest()` - Tracks both daily and weekly extension requests
- `getDailyExtensionCount()` - NEW method

### 4. Limit Enforcement (`background/limit-enforcer.js`)

**Updated `checkLimit()`:**
- Checks BOTH daily and weekly limits
- Daily limit checked first (more restrictive)
- Returns `limitType: 'daily'` or `'weekly'` when blocked
- Warns at 90% for both daily and weekly limits

### 5. TODO: Service Worker Updates

**Extension Request Handler needs:**
```javascript
// Check BOTH daily and weekly quotas
const dailyCount = await storageManager.getDailyExtensionCount(domain);
const weeklyCount = await storageManager.getWeeklyExtensionCount(domain);

if (dailyCount >= settings.maxDailyExtensions) {
  return { success: false, error: 'daily_limit_reached' };
}

if (weeklyCount >= settings.maxWeeklyExtensions) {
  return { success: false, error: 'weekly_limit_reached' };
}
```

### 6. TODO: Options UI Updates

**Add Domain Form:**
```html
<input type="number" id="daily-limit" placeholder="Daily limit (hours)">
<input type="number" id="weekly-limit" placeholder="Weekly limit (hours)">
```

**Validation:**
- If daily limit is set, weekly limit must be >= daily limit
- Auto-suggest: weekly = daily × 7

**Domain Display:**
```
LIMITED DOMAINS
├── Daily: 2h / 3h (66%)
└── Weekly: 8h / 20h (40%)

UNLIMITED DOMAINS
└── (no limits set)
```

## Remaining Work

1. **Service Worker** (`background/service-worker.js`)
   - Update `handleExtensionRequest()` to check both daily and weekly quotas
   - Add settings for `maxDailyExtensions` (default: 3)

2. **Options Page** (`options/options.html` + `options/options.js`)
   - Add daily limit input field
   - Validate weekly >= daily
   - Auto-set weekly when daily is entered
   - Separate "Limited Domains" and "Unlimited Domains" sections
   - Show both daily and weekly progress bars

3. **Content Script** (`content/blocker.js`)
   - Update blocker UI to show which limit was exceeded (daily vs weekly)
   - Show both daily and weekly stats

4. **Settings** (`shared/constants.js`)
   - Add `maxDailyExtensions: 3` to DEFAULT_SETTINGS

## User Flow Examples

### Example 1: Setting Limits
```
User sets:
- Daily: 2 hours
- Weekly: 10 hours ✓ (valid: 10 > 2)

System tracks:
- Daily time (resets at midnight)
- Weekly time (resets Monday)
```

### Example 2: Extension Requests
```
Day 1: User hits daily limit (2hrs)
  → Requests 3 extensions (uses all 3)
  → Extensions count toward weekly too!

Day 2: Daily resets to 0
  → But weekly extensions still show 3 used
  → Can't request more until next week
```

### Example 3: Display
```
DOMAINS WITH LIMITS
┌─────────────────────┐
│ youtube.com    [BLOCKED - Daily]
│ Today: 2h / 2h ██████████ 100%
│ Week:  8h / 10h ████████░░ 80%
│ Extensions: 3/3 daily, 3/3 weekly
└─────────────────────┘

DOMAINS WITHOUT LIMITS
┌─────────────────────┐
│ github.com
│ Today: 1h 23m
│ Week: 5h 45m
│ (Free browsing - no limits)
└─────────────────────┘
```

## Testing Checklist

- [ ] Daily time increments correctly
- [ ] Daily time resets at midnight
- [ ] Weekly time persists across days
- [ ] Daily limit blocks when exceeded
- [ ] Weekly limit blocks when exceeded
- [ ] Extension requests count toward both quotas
- [ ] Daily extensions reset at midnight
- [ ] Weekly extensions reset on Monday
- [ ] Validation: weekly >= daily
- [ ] Auto-suggest weekly limit
- [ ] UI shows both limits correctly
- [ ] Blocked page shows which limit exceeded

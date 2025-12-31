# myTime - Smart Website Time Tracker

A Chrome extension that helps you track time spent on websites and set daily/weekly limits with smart blocking and extension requests.

## Features

### Core Tracking
- **Smart Time Tracking**: Automatically tracks active time spent on websites
  - Excludes Chrome internal pages (chrome://, chrome-extension://, etc.)
  - Filters out browser-specific pages (edge://, brave://, etc.)
  - Only tracks actual web content
- **Idle Detection**: Stops tracking when you're inactive (60 seconds default)
- **Visual Feedback**: Extension badge shows current site time with color coding

### Time Limits & Blocking
- **Flexible Limits**: Set daily and/or weekly time limits for specific domains
  - Fine-grained control: 0.1, 0.25, 0.5 hours and up
  - Daily limits (resets every 24 hours)
  - Weekly limits (resets every week)
  - Or track without limits (unlimited tracking)
- **Smart Blocking**: Automatically blocks websites when limits are exceeded
- **Extension Requests**: Request additional time with configurable daily/weekly quotas
- **Automatic Reset**: Daily and weekly limits reset automatically

### Domain Management
- **Professional Table View**: Manage domains in a clean, sortable table
- **Pagination**: View 10, 20, 50, or 100 domains per page
- **Search & Filter**:
  - Search domains by name
  - Filter by domains with limits or without limits
- **Domain Exclusion List**: Permanently exclude domains from tracking
  - Auto-removes excluded domains from tracking list
- **Bulk Management**: Add, edit, or delete multiple domains easily

### Statistics & Insights
- **Real-time Dashboard**: View detailed statistics of your web usage
- **Usage Percentages**: See daily and weekly usage at a glance
- **Color-coded Warnings**: Red indicators when approaching or exceeding limits
- **Weekly Overview**: Total time, domains tracked, most visited

### Data & Privacy
- **Export/Import**: Backup and restore all your data
- **Manual Resets**: Trigger daily or weekly resets manually
- **Local Storage**: All data stays on your device
- **No Tracking**: No external servers, no data collection

## Installation

### Option 1: Load Unpacked Extension (Development)

1. **Open Chrome Extensions Page**:
   - Navigate to `chrome://extensions/`
   - Or click the three-dot menu → More Tools → Extensions

2. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension**:
   - Click "Load unpacked"
   - Navigate to the `chrome-tracker-plugin` folder
   - Click "Select Folder"

4. **Verify Installation**:
   - You should see the Time Tracker extension in your extensions list
   - The extension icon should appear in your Chrome toolbar

### Option 2: Create PNG Icons (Recommended)

Before loading the extension, create proper icon files:

1. Navigate to `assets/icons/` folder
2. Convert the provided `icon.svg` to PNG files:
   - `icon16.png` - 16x16 pixels
   - `icon48.png` - 48x48 pixels
   - `icon128.png` - 128x128 pixels

You can use online tools like:
- https://cloudconvert.com/svg-to-png
- https://www.favicon-generator.org/

Or use ImageMagick command line:
```bash
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```

## Usage

### First Time Setup

1. **Open Options Page**:
   - Click the extension icon and select "Options"
   - Or right-click the extension icon → Options

2. **Add Domains to Track**:
   - Go to the "Domains" tab
   - Enter a domain name (e.g., `youtube.com`)
   - Set limits (all optional):
     - Daily Limit: e.g., `0.5` for 30 minutes, `2` for 2 hours
     - Weekly Limit: e.g., `5` for 5 hours per week
     - Leave empty or set to 0 for unlimited tracking
   - Click "Add Domain"

3. **Configure Settings** (Optional):
   - Go to the "Settings" tab
   - Adjust global settings:
     - Max daily extensions per domain (default: 3)
     - Max weekly extensions per domain (default: 3)
     - Default extension duration (default: 30 minutes)
     - Week start day (default: Monday)
     - Idle threshold (default: 60 seconds)

### Daily Use

1. **Automatic Tracking**:
   - Browse normally - the extension tracks time automatically
   - The badge on the extension icon shows time spent on current site
   - Badge color indicates usage:
     - Purple: Normal usage
     - Orange: 90% of limit reached
     - Red: Limit exceeded

2. **When Limit is Reached**:
   - The site will be blocked with a full-page overlay
   - You can request an extension if you have quota remaining
   - Fill out the extension request form:
     - Choose duration (15 min, 30 min, 1 hour, 2 hours)
     - Optionally provide a reason
   - Click "Request Extension"

3. **View Statistics**:
   - Open Options → Statistics tab
   - See weekly overview and time per domain
   - Monitor your usage patterns

### Managing Domains

- **Search**: Use the search box to filter domains by name
- **Filter**: Use the dropdown to show only domains with/without limits
- **Pagination**: Navigate through pages or change items per page (10/20/50/100)
- **Edit a Domain**: Click "Edit" in the Actions column to modify limits
- **Delete a Domain**: Click "Delete" to remove a domain and all its tracking data
- **View Usage**: See daily/weekly usage percentages in the table (red = 90%+)
- **Exclude Domains**: Add domains to the exclusion list to stop tracking permanently

## Features Explained

### Time Tracking
- Tracks only **active time** (when tab is focused and window is active)
- Automatically pauses when:
  - You switch tabs
  - Browser loses focus
  - You're idle for more than 60 seconds (configurable)
- Saves data every 10 seconds to prevent data loss

### Daily and Weekly Limits
- Set custom daily and/or weekly limits for each domain
- Support fine-grained limits (0.1 hours = 6 minutes)
- Daily limits reset every 24 hours
- Weekly limits reset every week (default: Monday, configurable)
- Can set only daily, only weekly, both, or neither (unlimited)
- Manual reset available in Settings

### Extension Requests
- Request additional time when blocked
- Configurable daily and weekly quotas (default: 3 each per domain)
- Choose duration from 15 minutes to 2 hours
- Extension automatically expires and re-blocks site
- Track usage across both daily and weekly quotas

### Data Management
- **Export Data**: Download all your tracking data as JSON
- **Import Data**: Restore data from a previous export
- **Reset All**: Clear all data and start fresh
- **Manual Weekly Reset**: Manually trigger a weekly reset

## Notifications

The extension shows notifications for:
- **Approaching Limit**: When you reach 90% of your limit
- **Limit Exceeded**: When your limit is reached
- **Extension Granted**: When an extension request is approved
- **Weekly Reset**: When limits reset for the new week

Notifications can be disabled in Settings.

## Keyboard Shortcuts

Currently, the extension doesn't have keyboard shortcuts, but you can add them:
1. Go to `chrome://extensions/shortcuts`
2. Find "Time Tracker"
3. Set custom shortcuts for actions

## Troubleshooting

### Extension Not Tracking Time
- Make sure "Enable time tracking" is checked in Settings
- Check if the domain is in your tracking list
- Verify the extension has necessary permissions

### Badge Not Showing
- The badge only shows when tracking a domain with a time limit
- Make sure you've added the domain and set a limit

### Blocker Not Working
- Reload the page after the limit is exceeded
- Check if you have an active extension
- Verify the domain is correctly configured

### Data Loss After Browser Restart
- The extension automatically saves data every 10 seconds
- Data persists in Chrome's local storage
- Use Export Data regularly to backup

## Development

### Project Structure
```
chrome-tracker-plugin/
├── manifest.json              # Extension manifest (V3)
├── background/
│   ├── service-worker.js      # Main background service worker
│   ├── storage-manager.js     # Data persistence layer
│   ├── time-tracker.js        # Time tracking logic
│   └── limit-enforcer.js      # Limit enforcement
├── content/
│   ├── blocker.js             # Blocking UI script
│   └── blocker.css            # Blocking UI styles
├── options/
│   ├── options.html           # Options page HTML
│   ├── options.js             # Options page logic
│   └── options.css            # Options page styles
├── shared/
│   ├── constants.js           # Shared constants
│   └── utils.js               # Utility functions
└── assets/icons/              # Extension icons
```

### Testing Checklist

- [ ] Time tracking starts when visiting a tracked domain
- [ ] Time tracking stops when switching tabs
- [ ] Time tracking stops when browser loses focus
- [ ] Time tracking stops after idle threshold
- [ ] Time persists across browser restarts
- [ ] Weekly limit enforcement works
- [ ] Blocker shows when limit exceeded
- [ ] Extension requests work correctly
- [ ] Extension quota is enforced
- [ ] Extensions expire and re-block
- [ ] Weekly reset clears data
- [ ] Options page loads and saves settings
- [ ] Add/Edit/Delete domains works
- [ ] Statistics display correctly
- [ ] Export/Import data works
- [ ] Notifications appear (if enabled)
- [ ] Badge updates in real-time

### Known Limitations

1. **Chrome Manifest V3**: Service workers can be terminated after inactivity
   - The extension handles this by saving frequently and restoring state

2. **Idle Detection**: Chrome's idle detection has a minimum of 15 seconds
   - We use 60 seconds by default for better accuracy

3. **Icon Files**: Placeholder icons need to be converted to PNG
   - Extension will work but may show console warnings

## Privacy

- **No Data Collection**: All data stays local on your device
- **No External Servers**: No data is sent anywhere
- **No Tracking**: The extension only tracks time locally
- **Full Control**: Export, import, or delete your data anytime

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

This project is for personal use. Feel free to modify and adapt for your needs.

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Review the console logs (F12 → Console)
3. Try reloading the extension
4. Reset all data and start fresh

## Version History

### v1.3.0 (2025-12-31)
- **Major UI Redesign**: Professional table view with pagination
- **Search & Filter**: Real-time domain search and filtering
- **Pagination**: View 10/20/50/100 domains per page
- **Daily Limits**: Added support for daily time limits alongside weekly
- **Fine-grained Limits**: Support for 0.1, 0.25, 0.5 hour increments
- **Unlimited Tracking**: Allow domains without any limits
- **Domain Exclusion**: Permanently exclude domains from tracking
- **Auto-delete**: Excluded domains automatically removed from tracking
- **Bug Fixes**:
  - Fixed blocked badge persistence after limit increase
  - Fixed form alignment issues
  - Improved limit validation (0 = no limit)
- **Testing**: Added 40+ comprehensive test cases
- **Performance**: Removed debug logging, optimized rendering

### v1.2.1 (2025-12-28)
- Fixed screen lock detection with active polling
- Improved idle detection accuracy

### v1.2.0 (2025-12-28)
- Redesigned domain sections as clickable sub-tabs
- Added domain exclusion feature
- Fixed domain sections UI

### v1.1.0 (2025-12-28)
- Added daily/weekly limits feature
- Improved limit enforcement

### v1.0.0 (2025-12-27)
- Initial release
- Time tracking for all domains
- Weekly limits with blocking
- Extension request system
- Options page with statistics
- Notifications and badges
- Data export/import

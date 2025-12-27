# myTime - Installation Guide

## 🚀 Quick Installation

### Method 1: Load Unpacked (Recommended for Development/Testing)

1. **Open Chrome Extensions Page:**
   - Navigate to `chrome://extensions/`
   - OR click the three-dot menu (⋮) → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle the "Developer mode" switch in the top-right corner

3. **Load the Extension:**
   - Click "Load unpacked" button
   - Navigate to the `chrome-tracker-plugin` folder (the root folder, not the build folder)
   - Click "Select Folder"

4. **Verify Installation:**
   - You should see "myTime" in your extensions list
   - The extension icon should appear in your Chrome toolbar
   - Click the puzzle icon in toolbar and pin the myTime extension

### Method 2: Install from ZIP (For Distribution)

1. **Extract the ZIP:**
   - Extract `chrome-tracker-plugin.zip` to a permanent location
   - **Important:** Don't delete the folder after installation - Chrome needs it!

2. **Follow Method 1 steps** above to load the unpacked extension from the extracted folder

## ⚙️ First-Time Setup

1. **Open Options Page:**
   - Right-click the extension icon → Options
   - OR go to `chrome://extensions/` and click "Details" → "Extension options"

2. **Add Your First Domain:**
   - Go to the "Domains" tab
   - Enter a domain (e.g., `youtube.com`, `reddit.com`)
   - Set a weekly limit in hours (e.g., `5` for 5 hours per week)
   - Click "Add Domain"

3. **Configure Settings (Optional):**
   - Go to the "Settings" tab
   - Adjust preferences:
     - Max weekly extensions: 3 (how many times you can extend time when blocked)
     - Default extension duration: 30 minutes
     - Week start day: Monday
     - Idle threshold: 60 seconds

4. **Start Browsing:**
   - Visit any tracked domain
   - Watch the extension badge show your time
   - Track your usage in the Statistics tab

## 🎯 Testing the Extension

### Quick Test:

1. **Add a test domain with a very low limit:**
   ```
   Domain: github.com
   Limit: 0.01 hours (less than 1 minute)
   ```

2. **Visit github.com**
   - Watch the badge update in real-time
   - You should get blocked within a minute

3. **Test Extension Request:**
   - When blocked, fill out the extension request form
   - Choose duration (15 min, 30 min, etc.)
   - Click "Request Extension"
   - The page should reload and you can browse again

4. **Check Statistics:**
   - Open Options → Statistics
   - See your tracked time and usage graphs

## 📁 File Structure

```
chrome-tracker-plugin/
├── manifest.json          ← Chrome extension configuration
├── background/            ← Background service worker
├── content/              ← Blocking UI scripts
├── options/              ← Settings page
├── shared/               ← Shared utilities
└── assets/icons/         ← Extension icons
```

## 🔧 Troubleshooting

### Extension Not Loading:
- Make sure you selected the correct folder (should contain `manifest.json`)
- Check Chrome console for errors: `chrome://extensions/` → Details → Errors

### Time Not Tracking:
- Verify "Enable time tracking" is checked in Settings
- Make sure the domain is added to your tracking list
- Check that you've set a weekly limit for the domain

### Blocker Not Showing:
- Reload the page after limit is exceeded
- Check browser console (F12) for errors
- Verify content script is injected: F12 → Sources → Content Scripts

### Icons Not Showing:
- Icons should now be included (16x16, 48x48, 128x128)
- If missing, check `assets/icons/` folder

## 🔄 Updating the Extension

If you update the extension code:

1. Go to `chrome://extensions/`
2. Click the refresh icon (🔄) on the Time Tracker extension
3. Or toggle the extension off and on

## 🗑️ Uninstalling

1. Go to `chrome://extensions/`
2. Click "Remove" on the Time Tracker extension
3. Confirm removal
4. Delete the extension folder if no longer needed

## 🌐 Publishing to Chrome Web Store (Optional)

To publish this extension:

1. Create a developer account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devcenter/register)
2. Pay the one-time $5 registration fee
3. Zip the extension folder (use the included `chrome-tracker-plugin.zip`)
4. Upload to the Chrome Web Store
5. Fill in store listing details (description, screenshots, etc.)
6. Submit for review

## 💡 Tips

- **Badge Colors:**
  - 🟣 Purple: Normal usage (< 90% of limit)
  - 🟠 Orange: Warning (90-99% of limit)
  - 🔴 Red: Limit exceeded (blocked)

- **Data Safety:**
  - All data is stored locally (chrome.storage.local)
  - Export your data regularly: Settings → Export Data
  - No data is sent to any server

- **Weekly Reset:**
  - Limits automatically reset every week (Monday by default)
  - You can manually reset: Settings → Manual Weekly Reset

## 📞 Support

For issues:
1. Check the browser console: F12 → Console
2. Check extension errors: `chrome://extensions/` → Details → Errors
3. Review the main README.md for detailed documentation

## 🎉 You're All Set!

Your Chrome Time Tracker extension is now installed and ready to help you manage your browsing time. Enjoy better productivity! 🚀

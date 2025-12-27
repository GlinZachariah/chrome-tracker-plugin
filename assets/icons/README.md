# Extension Icons

This extension requires icons in the following sizes:
- **icon16.png** - 16x16 pixels (toolbar icon)
- **icon48.png** - 48x48 pixels (extension management page)
- **icon128.png** - 128x128 pixels (Chrome Web Store)

## Temporary Placeholder

For development purposes, you can create simple placeholder PNG files using any image editor or online tool. Recommended icon theme: clock/timer to represent time tracking.

## Creating Icons

### Option 1: Online Icon Generator
1. Visit https://www.favicon-generator.org/ or similar
2. Upload a simple clock/timer icon or create one
3. Generate icons in required sizes

### Option 2: Using Image Editor
1. Create a simple clock icon design
2. Export as PNG in three sizes: 16x16, 48x48, 128x128
3. Save them in this directory with the correct filenames

## Converting the SVG

I've included a basic SVG icon below that you can convert to PNG:

```svg
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <circle cx="64" cy="64" r="60" fill="#4285f4" stroke="#1a73e8" stroke-width="2"/>
  <circle cx="64" cy="64" r="50" fill="white"/>
  <line x1="64" y1="64" x2="64" y2="30" stroke="#1a73e8" stroke-width="4" stroke-linecap="round"/>
  <line x1="64" y1="64" x2="85" y2="64" stroke="#1a73e8" stroke-width="3" stroke-linecap="round"/>
  <circle cx="64" cy="64" r="3" fill="#1a73e8"/>
</svg>
```

You can convert this SVG to PNG using:
- Online: https://cloudconvert.com/svg-to-png
- Command line: `convert -background none icon.svg -resize 128x128 icon128.png`

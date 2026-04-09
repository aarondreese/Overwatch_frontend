# Electron Conversion Guide

This document outlines the conversion of the Overwatch application from a Next.js web app to an Electron desktop application.

## What's Changed

### New Files Added
- **main.js** - Electron main process that creates and manages the application window
- **preload.js** - Preload script for secure IPC communication between main and renderer processes

### Modified Files
- **package.json** - Added Electron dependencies and updated build scripts
- **next.config.js** - Added configuration for Electron builds
- **pages/_app.js** - Added Electron context detection
- **.gitignore** - Added Electron build artifacts

## Development

To run the application in development mode with both Next.js and Electron:

```bash
npm run dev
```

This will start:
1. The Next.js development server on http://localhost:3000
2. The Electron app that loads the Next.js dev server

The Electron devtools will automatically open, allowing you to debug the renderer process.

## Build

To build the application for production:

```bash
npm run build
```

This will:
1. Build the Next.js application
2. Create the Electron application packages for your platform

## Accessing Electron APIs

The renderer process can access Electron APIs through the `window.electronAPI` object exposed by the preload script:

```javascript
// In your React components
if (typeof window !== 'undefined' && window.electronAPI) {
  // You can use the exposed APIs here
  window.electronAPI.getAppInfo().then(info => {
    console.log('App info:', info);
  });
}
```

## Project Structure

```
.
├── main.js              # Electron main process
├── preload.js           # Preload script for IPC
├── pages/               # Next.js pages
├── components/          # React components
├── public/              # Static assets
├── styles/              # CSS files
├── lib/                 # Utility functions
└── package.json         # Project dependencies and scripts
```

## Next Steps

1. **IPC Communication** - Expand the preload.js and main.js files to add more IPC channels for main process functionality
2. **Native Modules** - Consider adding native Node.js modules for system integration
3. **Auto-Updates** - Implement electron-updater for automatic app updates
4. **Signing & Certification** - Set up code signing for distribution (especially for Windows)
5. **Packaging** - Configure electron-builder for different platforms (Windows, macOS, Linux)

## Troubleshooting

### Port 3000 Already in Use
If port 3000 is in use, you can change it:
```bash
cross-env NEXT_PUBLIC_PORT=3001 npm run dev
```

### Electron Window Not Loading
Make sure the Next.js dev server is running on port 3000. Check the terminal output for errors.

### IPC Not Working
Ensure that your channel names match in both `preload.js` and `main.js` (the `validChannels` arrays).

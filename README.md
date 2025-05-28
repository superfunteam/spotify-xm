# Spotify XM - Music Player

A modern web-based music player that mimics XM radio functionality using the Spotify Web API and Web Playback SDK. The app plays random songs from your liked tracks, simulating the radio experience.

## Features

- 🎵 **Radio-style playback** - Plays random songs from your liked tracks
- 📻 **Station selection** - Browse through different stations (currently only "Liked Songs" is active)
- ⏭️ **Skip functionality** - Click the now playing area to skip to a random position in a random song
- 🎮 **Bluetooth controls** - Full support for media controls from Bluetooth devices, headphones, and car systems
- 🔄 **Auto-play next track** - Automatically plays the next random song when a track ends
- 🔐 **Secure authentication** - OAuth 2.0 flow with token refresh support
- 📱 **Responsive design** - Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Backend**: Netlify Functions (Node.js)
- **APIs**: Spotify Web API, Spotify Web Playback SDK
- **Deployment**: Netlify

## Prerequisites

- Spotify Premium account (required for Web Playback SDK)
- Node.js and npm installed locally
- Netlify CLI (optional, for local development)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd spotify-xm
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `https://your-netlify-app.netlify.app/.netlify/functions/spotify-auth-callback`
4. Note your Client ID and Client Secret

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
URL=https://your-netlify-app.netlify.app
```

For local development, use:
```env
URL=http://localhost:8888
```

### 5. Build Tailwind CSS

```bash
npm run dev
```

This will watch for changes in `src/input.css` and generate `src/output.css`.

### 6. Deploy to Netlify

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

Don't forget to set the environment variables in Netlify's dashboard.

## Local Development

```bash
# Run Netlify dev server
netlify dev

# In another terminal, run Tailwind CSS watcher
npm run dev
```

Visit `http://localhost:8888` to see the app.

## Project Structure

```
spotify-xm/
├── index.html              # Main HTML file
├── src/
│   ├── spotify-player.js   # Main JavaScript application
│   ├── input.css          # Tailwind CSS input file
│   └── output.css         # Generated CSS file
├── netlify/
│   └── functions/
│       ├── spotify-auth-login.js     # Initiates OAuth flow
│       ├── spotify-auth-callback.js  # Handles OAuth callback
│       └── spotify-auth-refresh.js   # Refreshes access tokens
├── stations/              # Station cover images
├── package.json
├── tailwind.config.js
└── netlify.toml
```

## Code Improvements & Refactoring

### Major Refactoring Done

1. **Separated JavaScript from HTML**
   - Moved all inline JavaScript to `src/spotify-player.js`
   - Created a proper class-based architecture with `SpotifyPlayer`

2. **Enhanced Error Handling**
   - Added comprehensive error handling for all API calls
   - Implemented retry logic with exponential backoff
   - Added user-friendly error notifications
   - Handle rate limiting gracefully

3. **Fixed Memory Leaks**
   - Properly cleanup intervals on page unload
   - Clear intervals when switching states
   - Added visibility change handling to pause updates when tab is hidden

4. **Implemented Token Refresh**
   - Created a new Netlify function for token refresh
   - Automatic token refresh before expiry
   - Seamless re-authentication when tokens expire

5. **Added Caching**
   - Cache liked songs for 5 minutes to reduce API calls
   - Implement cache invalidation strategies

6. **Improved Edge Cases**
   - Handle users with no liked songs
   - Properly detect track endings
   - Prevent duplicate track ending handlers
   - Handle missing album artwork gracefully

7. **UI/UX Improvements**
   - Added loading states with visual feedback
   - Toast notifications for errors and info
   - Smooth transitions and animations
   - Responsive design fixes
   - Added hover states and cursor pointers

8. **Code Organization**
   - Centralized configuration with `CONFIG` object
   - Consistent naming conventions
   - Proper separation of concerns
   - Added comprehensive comments

### Edge Cases Handled

1. **No Liked Songs**: Shows helpful error message directing users to like songs first
2. **Network Failures**: Retry logic with exponential backoff
3. **Rate Limiting**: Respects Spotify's rate limits and retries after specified time
4. **Missing Images**: Falls back to placeholder image when album art fails to load
5. **Token Expiry**: Automatic refresh before expiry with fallback to re-authentication
6. **Tab Visibility**: Pauses updates when tab is hidden to save resources
7. **Device Disconnection**: Handles device going offline gracefully
8. **Multiple Initializations**: Prevents duplicate initialization attempts
9. **Browser Compatibility**: Checks for MediaSession API support before using

## Features Not Yet Implemented

- Other station types (Oldies, 70s, 80s, etc.) - currently shows "coming soon" message
- Playlist creation from played songs
- Search functionality
- User preferences storage
- Volume control UI
- Seek bar interaction

## Known Limitations

- Requires Spotify Premium account for playback
- Web Playback SDK may not work in all browsers (best in Chrome/Edge)
- Limited to 50 liked songs per fetch (can be extended)

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this code for your own projects! 
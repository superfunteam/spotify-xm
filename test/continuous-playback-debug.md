# Continuous Playback Debugging Guide

## Quick Test

1. Open the browser console (F12)
2. Play any song from a station
3. Skip to near the end: In console, run:
   ```javascript
   // Skip to 10 seconds before end
   const player = document.querySelector('.now-playing-container').__spotifyPlayer;
   const state = await player.player.getCurrentState();
   if (state) {
     const targetPosition = state.duration - 10000; // 10 seconds before end
     await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${targetPosition}`, {
       method: 'PUT',
       headers: { 'Authorization': `Bearer ${player.accessToken}` }
     });
   }
   ```
4. Watch console logs as track approaches end

## Expected Console Output

When continuous playback is working, you should see:

```
[Monitor] Track: 245.3/250.0s, Remaining: 4.7s, Paused: false, Processed: false
Track progress: 248.1s / 250.0s (1900ms remaining) - Paused: false
[Monitor] Track: 248.3/250.0s, Remaining: 1.7s, Paused: false, Processed: false
Track progress: 249.5s / 250.0s (500ms remaining) - Paused: false
Track ended detected: {isPaused: true, nearEnd: true, atExactEnd: false, notProcessed: true}
=== TRACK ENDING - Starting next track ===
Executing next track playback...
Playing random liked song from beginning...
Selected track: Song Name by Artist Name
Track started successfully (natural progression)
```

## Common Issues

### Issue 1: No logs near track end
**Symptom**: No console output when track is about to end

**Check**:
1. Is `CONFIG.DEBUG_PLAYBACK` set to `true`?
2. Is the monitor running? Look for: "Starting continuous playback monitor..."
3. Check if player state updates are firing: "Player state changed:"

### Issue 2: Track pauses but doesn't advance
**Symptom**: See "Paused: true" but no "Track ended detected"

**Possible causes**:
- `trackEndingProcessed` might be stuck as `true`
- Position detection logic might be failing

**Debug**: In console, check the flag:
```javascript
document.querySelector('.now-playing-container').__spotifyPlayer.trackEndingProcessed
```

### Issue 3: State not updating
**Symptom**: Position stays the same in logs

**Check**: 
- Network connectivity
- Spotify API rate limits
- Player connection status

## Manual Trigger Test

To manually trigger the next track logic:
```javascript
const player = document.querySelector('.now-playing-container').__spotifyPlayer;
player.handleTrackEnding();
```

## Reset Flags

If continuous playback gets stuck:
```javascript
const player = document.querySelector('.now-playing-container').__spotifyPlayer;
player.trackEndingProcessed = false;
player.positionStallCount = 0;
player.continuousPlaybackEnabled = true;
```

## Spotify Behavior Notes

1. **Natural End**: Spotify usually pauses at track end (position ≈ duration)
2. **Gapless Playback**: If user has gapless playback enabled in Spotify, behavior may differ
3. **Network Issues**: Poor connection can cause position updates to lag
4. **Browser Differences**: Chrome/Edge have best Web Playback SDK support

## Enable Maximum Logging

For detailed debugging, in console:
```javascript
// Store player reference
window.__spotifyPlayer = document.querySelector('.now-playing-container').__spotifyPlayer;

// Override console.log to add timestamps
const originalLog = console.log;
console.log = function(...args) {
  originalLog(new Date().toISOString(), ...args);
};
```

## Report Format

If continuous playback still isn't working, collect:
1. Browser and version
2. Last 50 lines of console output
3. Result of manual trigger test
4. Network tab errors (if any)
5. Current track position/duration when it fails 
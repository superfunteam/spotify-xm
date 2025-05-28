# Playback Improvements Testing Checklist

## Setup
- [ ] Deploy the app or run locally with `netlify dev`
- [ ] Connect to Spotify with a Premium account
- [ ] Ensure you have Bluetooth headphones/speakers available for testing

## Test 1: Continuous Playback
1. [ ] Select any station (e.g., 90s)
2. [ ] Let a song play to completion
3. [ ] **Verify**: Next song starts automatically from 0:00
4. [ ] **Verify**: No volume changes during transition
5. [ ] **Verify**: Let it play through multiple songs continuously

## Test 2: Manual Skip with Volume Fade
1. [ ] While a song is playing, click the "Now Playing" area
2. [ ] **Verify**: Volume fades to 0 before track change
3. [ ] **Verify**: New track starts and seeks to random position
4. [ ] **Verify**: Volume fades back in smoothly after seeking
5. [ ] **Verify**: No jarring audio cuts or brief playback

## Test 3: Bluetooth Controls
1. [ ] Connect Bluetooth headphones or speaker
2. [ ] Start playback
3. [ ] Use Bluetooth next/previous buttons
4. [ ] **Verify**: Volume fades work with Bluetooth controls
5. [ ] **Verify**: MediaSession info shows on lock screen/device

## Test 4: Bluetooth Stability
1. [ ] Play music via Bluetooth device
2. [ ] Skip tracks multiple times
3. [ ] Let tracks end naturally
4. [ ] **Verify**: Bluetooth connection remains stable
5. [ ] **Verify**: No disconnection/reconnection sounds
6. [ ] **Verify**: Controls remain responsive

## Test 5: Station Switching
1. [ ] While playing from one station, switch to another
2. [ ] **Verify**: Smooth transition with volume fade
3. [ ] **Verify**: Bluetooth connection remains stable
4. [ ] **Verify**: New station's playlist cover loads

## Console Checks
Open browser console and verify:
- [ ] "Muted for transition" messages during skips
- [ ] "Volume restored to: X" messages after transitions
- [ ] "Playing track from beginning (natural progression)" for auto-advance
- [ ] No MediaSession errors
- [ ] No volume-related errors

## Edge Cases
- [ ] Test with very short songs (<30 seconds)
- [ ] Test rapid skipping (multiple skips quickly)
- [ ] Test pause/resume during transitions
- [ ] Test with poor network connection

## Performance
- [ ] Transitions feel smooth and professional
- [ ] No audio glitches or pops
- [ ] UI remains responsive during transitions
- [ ] Progress bar updates smoothly

## Notes
- Volume fade duration: 300ms (configurable)
- Random seek position: 20-50% of track duration
- Natural track endings always start next song from beginning 
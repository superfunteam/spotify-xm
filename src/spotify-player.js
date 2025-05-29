// Configuration
const CONFIG = {
  API_TIMEOUT: 10000, // 10 seconds
  TOKEN_REFRESH_BUFFER: 300000, // 5 minutes before expiry
  TRACK_END_THRESHOLD: 85, // percentage
  TRACK_RESET_THRESHOLD: 10, // percentage
  SEEK_DELAY: 500, // ms
  UPDATE_INTERVAL: 1000, // ms
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // ms
  LIKED_SONGS_LIMIT: 50,
  STATION_SCROLL_BEHAVIOR: 'smooth',
  RANDOM_POSITION_MIN: 0.2, // 20%
  RANDOM_POSITION_MAX: 0.5, // 50%
  VOLUME_FADE_DURATION: 300, // ms
  VOLUME_FADE_STEPS: 10, // number of steps for volume fade
  DEBUG_PLAYBACK: true, // Enable detailed logging for continuous playback
};

// Station definitions
const STATIONS = [
  { 
    id: 'liked', 
    name: 'Liked Songs', 
    description: 'Your favorites', 
    image: 'stations/station-liked.webp',
    type: 'liked' // Special type for liked songs
  },
  { 
    id: '90s', 
    name: '90s Throwbacks', 
    description: 'Biggest hits of the 90s', 
    image: 'stations/station.png',
    type: 'playlist',
    playlistId: '5nCCpeCobBAoF91TwgQetX' // Your 90s playlist
  },
  { 
    id: '80s', 
    name: 'All Out 80s', 
    description: 'The unforgettable 80s', 
    image: 'stations/station.png',
    type: 'playlist',
    playlistId: '08k56nfGw0gD8t3oXz8ugt'
  },
  { 
    id: '70s', 
    name: '70s Gold', 
    description: 'Hits from the 70s', 
    image: 'stations/station.png',
    type: 'playlist',
    playlistId: '6Y5RFouEwOtDevkKXVST5W'
  },
  { 
    id: '2k', 
    name: 'Y2K Hits', 
    description: 'Pop from the 2000s', 
    image: 'stations/station.png',
    type: 'playlist',
    playlistId: null // To be added when playlist is created
  },
  { 
    id: 'oldies', 
    name: 'Golden Oldies', 
    description: 'Classics from the 50s & 60s', 
    image: 'stations/station.png',
    type: 'playlist',
    playlistId: null // To be added when playlist is created
  },
  { 
    id: 'new', 
    name: 'Fresh Finds', 
    description: 'Latest music releases', 
    image: 'stations/station.png',
    type: 'playlist',
    playlistId: null // To be added when playlist is created
  },
  { 
    id: 'party', 
    name: 'Party Bangers', 
    description: 'High-energy anthems', 
    image: 'stations/station.png',
    type: 'playlist',
    playlistId: null // To be added when playlist is created
  },
  { 
    id: 'highschool', 
    name: 'HS Rewind', 
    description: 'Your high school soundtrack', 
    image: 'stations/station.png',
    type: 'playlist',
    playlistId: null // To be added when playlist is created
  },
  { 
    id: 'talk', 
    name: 'Talk & Podcasts', 
    description: 'News, comedy & stories', 
    image: 'stations/station.png',
    type: 'podcast',
    playlistId: null // Could be a podcast show ID in the future
  },
];

class SpotifyPlayer {
  constructor() {
    this.player = null;
    this.deviceId = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
    this.timeUpdateInterval = null;
    this.tokenRefreshInterval = null;
    this.previousState = null;
    this.trackEndingProcessed = false;
    this.currentStation = 'liked';
    this.likedSongsCache = null;
    this.playlistCache = {}; // Cache for playlist tracks
    this.cacheExpiresAt = null;
    this.retryCount = 0;
    this.isInitializing = false;
    this.savedVolume = 0.5; // Store the user's preferred volume
    this.isTransitioning = false; // Track if we're in a transition
    this.lastKnownPosition = 0; // Track position for stall detection
    this.positionStallCount = 0; // Count position stalls
    this.continuousPlaybackEnabled = true; // Flag to control continuous playback
    this.lastPlayedTrackUri = null; // Track the last played track to avoid repeats
    this.recentlyPlayedUris = []; // Keep track of recently played tracks
    this.currentTrackUri = null; // Track the current track URI
  }

  async init() {
    if (this.isInitializing) {
      console.log('Already initializing, skipping duplicate init');
      return;
    }
    
    this.isInitializing = true;
    
    try {
      this.setupEventListeners();
      const authResult = await this.handleAuth();
      
      if (authResult && authResult.accessToken) {
        await this.initializeSpotifyPlayer(authResult.accessToken);
      }
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize player. Please refresh the page.');
    } finally {
      this.isInitializing = false;
    }
  }

  setupEventListeners() {
    // Station selection
    document.querySelectorAll('.station').forEach((station, index) => {
      station.addEventListener('click', () => this.selectStation(index));
    });

    // Connect Spotify button
    const connectBtn = document.getElementById('connect-spotify-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        window.location.href = '/.netlify/functions/spotify-auth-login';
      });
    }

    // Now playing area click (skip to random position)
    const nowPlayingArea = document.querySelector('.now-playing-container');
    if (nowPlayingArea) {
      // Don't set cursor on the container anymore, it's set in HTML on .now-playing
      nowPlayingArea.addEventListener('click', (event) => {
        // Don't trigger if clicking on media controls
        if (event.target.closest('.media-controls') || 
            event.target.closest('#previous-btn') || 
            event.target.closest('#play-pause-btn') || 
            event.target.closest('#next-btn')) {
          return;
        }
        // Only trigger if clicking on the now-playing area itself
        if (event.target.closest('.now-playing')) {
          this.handleNowPlayingClick();
        }
      });
    }

    // Media control buttons
    const previousBtn = document.getElementById('previous-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const nextBtn = document.getElementById('next-btn');

    if (previousBtn) {
      previousBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.handlePreviousClick();
      });
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.handlePlayPauseClick();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.handleNextClick();
      });
    }

    // Handle visibility change to pause/resume updates
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseUpdates();
      } else {
        this.resumeUpdates();
      }
    });

    // Initialize the first station (Liked) as active
    this.initializeDefaultStation();
  }

  initializeDefaultStation() {
    // Mark the first station (Liked Songs) as active by default
    const stations = document.querySelectorAll('.station');
    if (stations.length > 0) {
      stations[0].classList.add('active');
      
      // Scroll the first station into view
      stations[0].scrollIntoView({ 
        behavior: CONFIG.STATION_SCROLL_BEHAVIOR, 
        block: 'nearest', 
        inline: 'center' 
      });
      
      console.log('Initialized Liked Songs station as active');
    }
  }

  selectStation(index) {
    const stations = document.querySelectorAll('.station');
    
    // Remove active state from all stations
    stations.forEach(station => {
      station.classList.remove('active');
    });

    // Add active state to selected station
    const selectedStation = stations[index];
    if (selectedStation) {
      selectedStation.classList.add('active');
      
      // Scroll into view
      selectedStation.scrollIntoView({ 
        behavior: CONFIG.STATION_SCROLL_BEHAVIOR, 
        block: 'nearest', 
        inline: 'center' 
      });

      // Update current station
      this.currentStation = STATIONS[index].id;
      
      // Update cover image for playlist-based stations
      const stationData = STATIONS[index];
      if (stationData.type === 'playlist' && stationData.playlistId) {
        this.updateStationCoverImage(index, stationData.playlistId);
      }
      
      // Play from the selected station
      this.playFromCurrentStation();
    }
  }

  async playFromCurrentStation() {
    if (!this.accessToken || !this.deviceId) {
      console.warn('Cannot play: missing access token or device ID');
      return;
    }

    const currentStationData = STATIONS.find(s => s.id === this.currentStation);
    if (!currentStationData) {
      console.error('Station not found:', this.currentStation);
      return;
    }

    switch (currentStationData.type) {
      case 'liked':
        await this.playRandomLikedSongAtRandomPosition();
        break;
      
      case 'playlist':
        if (currentStationData.playlistId) {
          await this.playRandomPlaylistSongAtRandomPosition(currentStationData.playlistId);
        } else {
          this.showNotification(`${currentStationData.name} playlist not configured yet!`);
        }
        break;
      
      case 'podcast':
        this.showNotification(`${currentStationData.name} coming soon!`);
        break;
      
      default:
        this.showNotification(`${currentStationData.name} station type not supported!`);
    }
  }

  async handleAuth() {
    const hashParams = this.parseHashParams();
    const authOverlay = document.getElementById('spotify-auth-overlay');
    
    if (hashParams.error) {
      this.handleAuthError(hashParams.error, authOverlay);
      return null;
    }

    if (hashParams.accessToken) {
      this.storeTokens(hashParams);
      this.hideAuthOverlay(authOverlay);
      window.location.hash = '';
      this.setupTokenRefresh();
      return hashParams;
    }

    // Check for existing valid token
    const storedToken = this.getStoredToken();
    if (storedToken) {
      this.hideAuthOverlay(authOverlay);
      this.setupTokenRefresh();
      return storedToken;
    }

    // No valid token, show auth overlay
    this.showAuthOverlay(authOverlay);
    return null;
  }

  parseHashParams() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
      accessToken: params.get('access_token'),
      refreshToken: params.get('refresh_token'),
      expiresIn: params.get('expires_in'),
      error: params.get('error'),
    };
  }

  storeTokens(tokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.tokenExpiresAt = Date.now() + parseInt(tokens.expiresIn, 10) * 1000;
    
    localStorage.setItem('spotify_access_token', this.accessToken);
    localStorage.setItem('spotify_token_expires_at', this.tokenExpiresAt);
    if (this.refreshToken) {
      localStorage.setItem('spotify_refresh_token', this.refreshToken);
    }
  }

  getStoredToken() {
    const accessToken = localStorage.getItem('spotify_access_token');
    const expiresAt = localStorage.getItem('spotify_token_expires_at');
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    
    if (accessToken && expiresAt && Date.now() < parseInt(expiresAt, 10)) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.tokenExpiresAt = parseInt(expiresAt, 10);
      return { accessToken, refreshToken, expiresAt };
    }
    
    // Token expired, try to refresh if we have a refresh token
    if (refreshToken && expiresAt) {
      return this.refreshAccessToken(refreshToken);
    }
    
    return null;
  }

  setupTokenRefresh() {
    // Clear any existing interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    // Set up periodic token refresh
    this.tokenRefreshInterval = setInterval(() => {
      const timeUntilExpiry = this.tokenExpiresAt - Date.now();
      if (timeUntilExpiry < CONFIG.TOKEN_REFRESH_BUFFER && this.refreshToken) {
        this.refreshAccessToken(this.refreshToken);
      }
    }, 60000); // Check every minute
  }

  async refreshAccessToken(refreshToken) {
    try {
      console.log('Refreshing access token...');
      
      const response = await fetch('/.netlify/functions/spotify-auth-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Token refresh failed');
      }

      const data = await response.json();
      
      // Store the new tokens
      this.storeTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in
      });

      console.log('Access token refreshed successfully');
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, clear tokens and show auth overlay
      this.clearStoredTokens();
      this.showAuthOverlay(document.getElementById('spotify-auth-overlay'));
      return null;
    }
  }

  clearStoredTokens() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_token_expires_at');
    localStorage.removeItem('spotify_refresh_token');
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
  }

  async initializeSpotifyPlayer(accessToken) {
    console.log('Initializing Spotify Player...');
    this.accessToken = accessToken;
    
    return new Promise((resolve, reject) => {
      window.onSpotifyWebPlaybackSDKReady = () => {
        try {
          this.player = new Spotify.Player({
            name: 'Spotify XM Player',
            getOAuthToken: cb => { cb(this.accessToken); },
            volume: 0.5
          });

          this.setupPlayerListeners();
          this.player.connect().then(success => {
            if (success) {
              console.log('Successfully connected to Spotify!');
              resolve();
            } else {
              reject(new Error('Failed to connect to Spotify'));
            }
          });
        } catch (error) {
          reject(error);
        }
      };

      // Trigger the callback if SDK is already loaded
      if (window.Spotify) {
        window.onSpotifyWebPlaybackSDKReady();
      }
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Spotify SDK loading timeout'));
      }, CONFIG.API_TIMEOUT);
    });
  }

  setupPlayerListeners() {
    // Error handling
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize:', message);
      this.showError('Failed to initialize player');
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Failed to authenticate:', message);
      this.handleAuthenticationError();
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('Failed to validate Spotify account:', message);
      this.showError('Account validation failed. Ensure you have a Spotify Premium account.');
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('Failed to perform playback:', message);
      this.retryPlayback();
    });

    // Playback status updates
    this.player.addListener('player_state_changed', (state) => {
      console.log('Player state changed:', state ? {
        paused: state.paused,
        position: state.position,
        duration: state.duration,
        track: state.track_window?.current_track?.name
      } : 'null state');
      
      if (!state) return;
      
      this.handleStateChange(state);
      this.updateNowPlayingUI(state);
      this.startTimeUpdates();
    });

    // Ready
    this.player.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      this.deviceId = device_id;
      this.onPlayerReady();
    });

    // Not Ready
    this.player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
      this.pauseUpdates();
    });
  }

  handleStateChange(state) {
    // Update MediaSession playback state based on actual player state
    if ('mediaSession' in navigator && state) {
      navigator.mediaSession.playbackState = state.paused ? 'paused' : 'playing';
      
      // Update position state for scrubbing support
      if (state.position !== undefined && state.duration !== undefined) {
        try {
          navigator.mediaSession.setPositionState({
            duration: state.duration / 1000, // Convert to seconds
            playbackRate: 1.0,
            position: state.position / 1000 // Convert to seconds
          });
        } catch (error) {
          console.log('MediaSession position state not supported:', error);
        }
      }
    }

    // Update play/pause button state
    this.updatePlayPauseButton(state.paused);

    // Capture current track URI if available
    if (state && state.track_window && state.track_window.current_track) {
      const currentUri = state.track_window.current_track.uri;
      if (currentUri && currentUri !== this.lastPlayedTrackUri) {
        console.log(`Now playing: ${state.track_window.current_track.name} (${currentUri})`);
        this.lastPlayedTrackUri = currentUri;
      }
    }

    // Enhanced track ending detection
    if (state && this.isTrackAtEnd(state)) {
      this.handleTrackEnding();
    }
    
    this.previousState = { ...state };
  }

  isTrackAtEnd(state) {
    if (!state || state.position === undefined || state.duration === undefined) {
      return false;
    }

    const positionMs = state.position;
    const durationMs = state.duration;
    const timeRemainingMs = durationMs - positionMs;
    
    // More detailed logging
    if (timeRemainingMs < 2000 || positionMs < 1000) {
      console.log(`Track progress: ${(positionMs/1000).toFixed(1)}s / ${(durationMs/1000).toFixed(1)}s (${timeRemainingMs}ms remaining) - Paused: ${state.paused}`);
    }

    // NEW: Trigger ending 1 second before natural end while still playing
    // This prevents Spotify's default behavior of resetting to 0 and pausing
    if (!state.paused && timeRemainingMs > 0 && timeRemainingMs < 1000 && !this.trackEndingProcessed) {
      console.log('Track approaching natural end - triggering early transition');
      return true;
    }

    // FALLBACK: Check if position suddenly reset to near 0 (track restarted)
    if (this.previousState && 
        this.previousState.position > durationMs * 0.9 && // Was near the end
        positionMs < 1000 && // Now at the beginning
        state.paused) { // And paused
      console.log('Track reset detected - was at end, now at beginning and paused');
      return !this.trackEndingProcessed;
    }

    // Check multiple conditions for track ending
    const conditions = {
      isPaused: state.paused,
      nearEnd: timeRemainingMs < 1000 && timeRemainingMs >= -100, // Within 1 second of end (with small negative buffer)
      atExactEnd: positionMs >= durationMs,
      atBeginningPaused: positionMs < 1000 && state.paused && this.previousState && this.previousState.position > positionMs + 10000, // Reset detection
      notProcessed: !this.trackEndingProcessed
    };

    // Track has ended if any of these combinations are true:
    const isEnded = conditions.notProcessed && (
      // Paused within 1 second of the end
      (conditions.isPaused && conditions.nearEnd) ||
      // Position is at or past duration (regardless of pause state)
      conditions.atExactEnd ||
      // Position reset to beginning while paused
      conditions.atBeginningPaused ||
      // Stalled at near the end (position not changing)
      (this.isPositionStalled(state) && timeRemainingMs < 2000)
    );

    if (isEnded) {
      console.log('Track ended detected:', conditions);
    }

    return isEnded;
  }

  isPositionStalled(state) {
    if (!state || state.position === undefined) {
      return false;
    }

    // Check if position hasn't changed
    const hasStalled = !state.paused && 
                      Math.abs(state.position - this.lastKnownPosition) < 100; // Less than 100ms change

    if (hasStalled) {
      this.positionStallCount++;
      console.log('Position stalled, count:', this.positionStallCount);
    } else {
      this.positionStallCount = 0;
      this.lastKnownPosition = state.position;
    }

    // Consider it stalled if position hasn't changed for 3 consecutive checks
    return this.positionStallCount >= 3;
  }

  handleTrackEnding() {
    if (!this.continuousPlaybackEnabled) {
      console.log('Continuous playback disabled, not advancing to next track');
      return;
    }

    // Prevent multiple simultaneous calls
    if (this.trackEndingProcessed) {
      console.log('Track ending already being processed, skipping');
      return;
    }

    console.log('=== TRACK ENDING - Starting next track ===');
    this.trackEndingProcessed = true;
    
    // Reset stall detection
    this.positionStallCount = 0;
    
    // Immediately pause to prevent any further playback issues
    this.player.pause().then(() => {
      console.log('Current track paused successfully');
    }).catch(err => {
      console.log('Error pausing (may already be paused):', err);
    });
    
    // Small delay to ensure the current track has fully stopped
    setTimeout(() => {
      console.log('Executing next track playback...');
      this.playNextTrackFromBeginning().then(() => {
        console.log('Next track playback initiated successfully');
        // Reset the flag after successful transition
        setTimeout(() => { 
          this.trackEndingProcessed = false;
          console.log('Track ending flag reset');
        }, 3000); // Reduced from 5000 for quicker recovery
      }).catch(error => {
        console.error('Failed to play next track:', error);
        this.trackEndingProcessed = false; // Reset on error to allow retry
        
        // Show error to user
        this.showError('Failed to play next track. Trying again...');
        
        // Try once more after a delay
        setTimeout(() => {
          this.playNextTrackFromBeginning().catch(err => {
            console.error('Retry also failed:', err);
            this.showError('Playback failed. Click to skip to next track.');
          });
        }, 2000);
      });
    }, 500); // Reduced delay from 500ms to 500ms for consistency
  }

  async playNextTrackFromBeginning() {
    const currentStationData = STATIONS.find(s => s.id === this.currentStation);
    if (!currentStationData) {
      console.error('Station not found:', this.currentStation);
      return;
    }

    // Mark that we're in a transition to maintain MediaSession
    this.isTransitioning = true;

    switch (currentStationData.type) {
      case 'liked':
        await this.playRandomLikedSongFromBeginning();
        break;
      
      case 'playlist':
        if (currentStationData.playlistId) {
          await this.playRandomPlaylistSongFromBeginning(currentStationData.playlistId);
        }
        break;
      
      default:
        // For unsupported types, just play from liked songs as fallback
        await this.playRandomLikedSongFromBeginning();
    }

    // Transition complete
    this.isTransitioning = false;
  }

  async onPlayerReady() {
    this.setupMediaSessionHandlers();
    // Preload playlist cover images
    await this.preloadStationCoverImages();
    // Start continuous playback monitoring
    this.startContinuousPlaybackMonitor();
    // Initialize play/pause button state
    this.updatePlayPauseButton(true); // Start with play icon showing (paused state)
    await this.playFromCurrentStation();
  }

  setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) {
      console.log('MediaSession API not supported');
      return;
    }

    console.log('Setting up MediaSession handlers');

    navigator.mediaSession.setActionHandler('play', async () => {
      console.log('Play triggered from MediaSession');
      if (this.player) {
        await this.player.resume();
        // Update playback state
        navigator.mediaSession.playbackState = 'playing';
      }
    });

    navigator.mediaSession.setActionHandler('pause', async () => {
      console.log('Pause triggered from MediaSession');
      if (this.player) {
        await this.player.pause();
        // Update playback state
        navigator.mediaSession.playbackState = 'paused';
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', async () => {
      console.log('Next track triggered from MediaSession');
      // Maintain playing state during transition
      if (this.player) {
        navigator.mediaSession.playbackState = 'playing';
        await this.playFromCurrentStation();
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', async () => {
      console.log('Previous track triggered from MediaSession');
      // Maintain playing state during transition
      if (this.player) {
        navigator.mediaSession.playbackState = 'playing';
        await this.playFromCurrentStation();
      }
    });

    // Set initial playback state
    navigator.mediaSession.playbackState = 'none';
  }

  async fetchLikedSongs(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh && this.likedSongsCache && this.cacheExpiresAt > Date.now()) {
      return this.likedSongsCache;
    }

    try {
      const response = await this.fetchWithRetry(
        `https://api.spotify.com/v1/me/tracks?limit=${CONFIG.LIKED_SONGS_LIMIT}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch liked songs: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the results for 5 minutes
      this.likedSongsCache = data;
      this.cacheExpiresAt = Date.now() + 300000;
      
      return data;
    } catch (error) {
      console.error('Error fetching liked songs:', error);
      this.showError('Failed to load your liked songs');
      throw error;
    }
  }

  async fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 1;
          await this.delay(parseInt(retryAfter) * 1000);
          continue;
        }
        
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(CONFIG.RETRY_DELAY * (i + 1));
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async playRandomLikedSongFromBeginning() {
    try {
      console.log('Playing random liked song from beginning...');
      const data = await this.fetchLikedSongs();
      
      if (!data.items || data.items.length === 0) {
        console.error('No liked songs found for continuous playback');
        this.showError('No liked songs found. Please like some songs on Spotify first.');
        return;
      }

      const randomTrack = this.selectRandomTrack(data.items);
      
      // Mark as transitioning for smooth MediaSession handling
      this.isTransitioning = true;
      
      // Don't mute for natural progression - just play the track
      await this.playTrack(randomTrack.uri);
      
      this.isTransitioning = false;
      
      console.log('Track started successfully (natural progression)');
    } catch (error) {
      console.error('Error playing random liked song from beginning:', error);
      this.isTransitioning = false;
      // Reset the ending flag to allow retry
      this.trackEndingProcessed = false;
      
      // Show error to user
      this.showError('Failed to play next track. Trying again...');
      
      // Try once more after a delay
      setTimeout(() => {
        this.playRandomLikedSongFromBeginning();
      }, 2000);
    }
  }

  async playRandomLikedSongAtRandomPosition() {
    try {
      // Save current volume and mute for smooth transition
      await this.muteForTransition();
      
      const data = await this.fetchLikedSongs();
      
      if (!data.items || data.items.length === 0) {
        this.showError('No liked songs found. Please like some songs on Spotify first.');
        await this.restoreVolume();
        return;
      }

      const randomTrack = this.selectRandomTrack(data.items);
      await this.playTrack(randomTrack.uri);

      // Seek to random position after a delay, then restore volume
      const randomPosition = this.calculateRandomPosition(randomTrack.duration_ms);
      setTimeout(async () => {
        await this.seekToPosition(randomPosition);
        // Restore volume after seeking is complete
        setTimeout(() => this.restoreVolume(), 200);
      }, CONFIG.SEEK_DELAY);
    } catch (error) {
      console.error('Error playing random song at random position:', error);
      await this.restoreVolume();
    }
  }

  selectRandomTrack(tracks) {
    if (!tracks || tracks.length === 0) {
      throw new Error('No tracks available to select from');
    }

    // If we have very few tracks, just pick randomly
    if (tracks.length <= 3) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      return tracks[randomIndex].track;
    }

    // Filter out recently played tracks if possible
    const availableTracks = tracks.filter(item => {
      const track = item.track;
      return track && track.uri && !this.recentlyPlayedUris.includes(track.uri);
    });

    // If all tracks have been played recently, clear the history and use all tracks
    const tracksToChooseFrom = availableTracks.length > 0 ? availableTracks : tracks;
    
    let selectedTrack;
    let attempts = 0;
    const maxAttempts = 10;

    // Try to select a different track than the last played one
    do {
      const randomIndex = Math.floor(Math.random() * tracksToChooseFrom.length);
      selectedTrack = tracksToChooseFrom[randomIndex].track;
      attempts++;
    } while (selectedTrack.uri === this.lastPlayedTrackUri && attempts < maxAttempts && tracksToChooseFrom.length > 1);

    // Update recently played tracks (keep last 5)
    this.recentlyPlayedUris.push(selectedTrack.uri);
    if (this.recentlyPlayedUris.length > 5) {
      this.recentlyPlayedUris.shift();
    }
    this.lastPlayedTrackUri = selectedTrack.uri;

    console.log(`Selected track: ${selectedTrack.name} by ${selectedTrack.artists[0].name} (avoiding ${this.recentlyPlayedUris.length - 1} recent tracks)`);
    
    return selectedTrack;
  }

  calculateRandomPosition(duration) {
    const minPosition = duration * CONFIG.RANDOM_POSITION_MIN;
    const maxPosition = duration * CONFIG.RANDOM_POSITION_MAX;
    return Math.floor(Math.random() * (maxPosition - minPosition) + minPosition);
  }

  async playTrack(uri, retryCount = 0) {
    if (!this.deviceId) {
      throw new Error('No device ID available');
    }

    console.log(`Attempting to play track: ${uri} (attempt ${retryCount + 1})`);

    // Mark as transitioning to maintain MediaSession
    const wasTransitioning = this.isTransitioning;
    this.isTransitioning = true;

    try {
      // First ensure our device is active
      await this.ensureDeviceActive();

      // Then play the track
      const response = await this.fetchWithRetry(
        `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uris: [uri],
            position_ms: 0 // Explicitly start from beginning
          })
        }
      );

      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to play track: ${response.status}`);
      }

      // Wait a moment to ensure playback started
      await this.delay(500);

      // Verify playback actually started
      const state = await this.player.getCurrentState();
      if (state && state.paused && state.track_window.current_track.uri === uri) {
        console.warn('Track loaded but is paused, attempting to resume...');
        await this.player.resume();
        
        // Check again after resume
        await this.delay(300);
        const newState = await this.player.getCurrentState();
        if (newState && newState.paused) {
          throw new Error('Failed to start playback - track remains paused');
        }
      }

      console.log('Track playback started successfully');
    } catch (error) {
      console.error('Error playing track:', error);
      
      // Retry logic
      if (retryCount < 2) {
        console.log(`Retrying playback (attempt ${retryCount + 2})...`);
        await this.delay(1000);
        return this.playTrack(uri, retryCount + 1);
      }
      
      throw error;
    } finally {
      // Restore transition state if it wasn't set before
      if (!wasTransitioning) {
        this.isTransitioning = false;
      }
    }
  }

  async ensureDeviceActive() {
    // Only transfer if not already active and not transitioning
    if (this.isTransitioning) {
      console.log('Already transitioning, skipping device transfer');
      return;
    }

    const response = await this.fetchWithRetry(
      `https://api.spotify.com/v1/me/player`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_ids: [this.deviceId],
          play: false // Don't start playing yet
        })
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to activate device: ${response.status}`);
    }
  }

  async seekToPosition(position) {
    try {
      const response = await this.fetchWithRetry(
        `https://api.spotify.com/v1/me/player/seek?position_ms=${position}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to seek: ${response.status}`);
      }
    } catch (error) {
      console.error('Error seeking to position:', error);
    }
  }

  updateNowPlayingUI(state) {
    if (!state || !state.track_window || !state.track_window.current_track) {
      console.log('Cannot update UI - no track information in state');
      return;
    }

    const { track_window: { current_track }, position, duration } = state;
    const artShadeElement = document.querySelector('.art-shade');

    // Store current track URI
    if (current_track.uri) {
      this.currentTrackUri = current_track.uri;
    }

    if (CONFIG.DEBUG_PLAYBACK) {
      console.log(`Updating UI for: ${current_track.name} (${(position/1000).toFixed(1)}/${(duration/1000).toFixed(1)}s)`);
    }

    // Update cover image
    const coverElement = document.querySelector('.now-playing .cover');
    if (coverElement && current_track.album.images.length > 0) {
      const imageUrl = current_track.album.images[0].url;
      coverElement.style.backgroundImage = `url('${imageUrl}')`;
      if (artShadeElement) {
        artShadeElement.style.backgroundImage = `url('${imageUrl}')`;
        artShadeElement.style.opacity = '0.6';
      }
      
      // Handle image loading errors
      const img = new Image();
      img.onerror = () => {
        coverElement.style.backgroundImage = `url('cover.png')`;
        if (artShadeElement) {
          artShadeElement.style.backgroundImage = 'none'; // Or a default, or keep last good one
          artShadeElement.style.opacity = '0';
        }
      };
      img.src = imageUrl;
    } else if (coverElement) {
        // Fallback if no images are available
        coverElement.style.backgroundImage = `url('cover.png')`;
        if (artShadeElement) {
            artShadeElement.style.backgroundImage = 'none';
            artShadeElement.style.opacity = '0';
        }
    }

    // Update track information
    this.updateTextElement('.track-title', current_track.name);
    this.updateTextElement('.artist-name', current_track.artists.map(a => a.name).join(', '));
    this.updateTextElement('.album-title', current_track.album.name);

    // Update duration
    this.updateTimeDisplay('.time-total', duration);
    this.updateTimeDisplay('.time-elapsed', position);

    // Update MediaSession
    this.updateMediaSession(current_track);
  }

  updateTextElement(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = text;
      element.title = text; // Add tooltip for truncated text
    }
  }

  updateTimeDisplay(selector, milliseconds) {
    const element = document.querySelector(selector);
    if (element && milliseconds !== undefined) {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.floor((milliseconds % 60000) / 1000);
      element.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      artwork: track.album.images.map(image => ({
        src: image.url,
        sizes: `${image.width || 96}x${image.height || 96}`,
        type: 'image/jpeg'
      }))
    });

    // Ensure playback state is set to playing
    if (!this.isTransitioning) {
      navigator.mediaSession.playbackState = 'playing';
    }
  }

  startTimeUpdates() {
    this.pauseUpdates();
    
    this.timeUpdateInterval = setInterval(async () => {
      if (!this.player || document.hidden) return;
      
      try {
        const state = await this.player.getCurrentState();
        if (state) {
          this.updateElapsedTime(state.position, state.duration);
          
          // Additional check for track ending during time updates
          if (this.isTrackAtEnd(state)) {
            this.handleTrackEnding();
          }
        }
      } catch (error) {
        console.error('Error updating time:', error);
      }
    }, CONFIG.UPDATE_INTERVAL);
  }

  pauseUpdates() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  resumeUpdates() {
    if (this.player && !this.timeUpdateInterval) {
      this.startTimeUpdates();
    }
  }

  updateElapsedTime(position, duration) {
    this.updateTimeDisplay('.time-elapsed', position);
    
    // Update progress bar
    const progressElement = document.querySelector('.progress');
    if (progressElement && position !== undefined && duration > 0) {
      const progressPercentage = (position / duration) * 100;
      progressElement.style.width = `${progressPercentage}%`;
    }

    // Update MediaSession position
    if ('mediaSession' in navigator && position !== undefined && duration !== undefined) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration / 1000,
          playbackRate: 1.0,
          position: position / 1000
        });
      } catch (error) {
        // Silently fail - not all browsers support this
      }
    }
  }

  handleNowPlayingClick() {
    if (!this.accessToken || !this.deviceId) {
      console.warn('Cannot skip: missing access token or device ID');
      return;
    }

    // Add visual feedback
    const nowPlayingArea = document.querySelector('.now-playing-container');
    nowPlayingArea?.classList.add('loading');
    
    // Play from current station with smooth transition
    this.playFromCurrentStation().finally(() => {
      nowPlayingArea?.classList.remove('loading');
    });
  }

  // Media control handlers
  async handlePreviousClick() {
    if (!this.player) {
      console.warn('Player not available');
      return;
    }

    try {
      // Seek to position 0 to restart current track
      await this.seekToPosition(0);
      console.log('Restarted current track');
    } catch (error) {
      console.error('Error restarting track:', error);
    }
  }

  async handlePlayPauseClick() {
    if (!this.player) {
      console.warn('Player not available');
      return;
    }

    try {
      const state = await this.player.getCurrentState();
      if (!state) {
        console.warn('No playback state available');
        return;
      }

      if (state.paused) {
        await this.player.resume();
        console.log('Resumed playback');
      } else {
        await this.player.pause();
        console.log('Paused playback');
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  }

  handleNextClick() {
    if (!this.accessToken || !this.deviceId) {
      console.warn('Cannot skip: missing access token or device ID');
      return;
    }

    // Use same functionality as clicking the now playing area
    this.handleNowPlayingClick();
  }

  updatePlayPauseButton(isPaused) {
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    
    if (playIcon && pauseIcon) {
      if (isPaused) {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
      } else {
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
      }
    }
  }

  handleAuthenticationError() {
    console.error('Authentication error - clearing tokens and re-authenticating');
    this.clearStoredTokens();
    this.showAuthOverlay(document.getElementById('spotify-auth-overlay'));
  }

  retryPlayback() {
    this.retryCount++;
    if (this.retryCount <= CONFIG.MAX_RETRIES) {
      console.log(`Retrying playback (attempt ${this.retryCount}/${CONFIG.MAX_RETRIES})...`);
      setTimeout(() => {
        this.playFromCurrentStation();
      }, CONFIG.RETRY_DELAY * this.retryCount);
    } else {
      this.showError('Playback failed after multiple attempts. Please refresh the page.');
      this.retryCount = 0;
    }
  }

  handleAuthError(error, authOverlay) {
    console.error('Spotify Auth Error:', error);
    if (authOverlay) {
      const title = authOverlay.querySelector('h2');
      const button = authOverlay.querySelector('button');
      const message = authOverlay.querySelector('p');
      
      if (title) title.textContent = 'Authentication Failed';
      if (button) button.textContent = 'TRY AGAIN';
      if (message) message.textContent = `Error: ${error}. Please ensure you have granted permissions and try again.`;
    }
    window.location.hash = '';
    this.showAuthOverlay(authOverlay);
  }

  showAuthOverlay(overlay) {
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  hideAuthOverlay(overlay) {
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  showError(message) {
    console.error(message);
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full';
      document.body.appendChild(notification);
    }

    // Set type-specific styles
    const typeStyles = {
      error: 'bg-red-600 text-white',
      info: 'bg-emerald-600 text-white',
      success: 'bg-green-600 text-white'
    };

    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${typeStyles[type] || typeStyles.info}`;
    notification.textContent = message;
    
    // Show notification
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 10);

    // Hide after 5 seconds
    setTimeout(() => {
      notification.classList.add('translate-x-full');
    }, 5000);
  }

  // Cleanup method
  destroy() {
    this.pauseUpdates();
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    if (this.player) {
      this.player.disconnect();
    }
  }

  async fetchPlaylistTracks(playlistId, forceRefresh = false) {
    // Check cache first
    const cacheKey = `playlist_${playlistId}`;
    if (!forceRefresh && this.playlistCache[cacheKey] && this.playlistCache[cacheKey].expiresAt > Date.now()) {
      return this.playlistCache[cacheKey].data;
    }

    try {
      console.log(`Fetching playlist tracks for playlist: ${playlistId}`);
      
      // Spotify allows max 100 tracks per request, but we'll get 50 for consistency
      const response = await this.fetchWithRetry(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${CONFIG.LIKED_SONGS_LIMIT}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch playlist tracks: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the results for 5 minutes
      this.playlistCache[cacheKey] = {
        data: data,
        expiresAt: Date.now() + 300000
      };
      
      return data;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      this.showError('Failed to load playlist tracks');
      throw error;
    }
  }

  async playRandomPlaylistSongAtRandomPosition(playlistId) {
    try {
      // Save current volume and mute for smooth transition
      await this.muteForTransition();
      
      const data = await this.fetchPlaylistTracks(playlistId);
      
      if (!data.items || data.items.length === 0) {
        this.showError('No tracks found in this playlist.');
        await this.restoreVolume();
        return;
      }

      // Filter out null tracks (deleted or unavailable tracks)
      const availableTracks = data.items.filter(item => item.track && item.track.uri);
      
      if (availableTracks.length === 0) {
        this.showError('No playable tracks found in this playlist.');
        await this.restoreVolume();
        return;
      }

      const randomTrack = this.selectRandomTrack(availableTracks);
      await this.playTrack(randomTrack.uri);

      // Seek to random position after a delay, then restore volume
      const randomPosition = this.calculateRandomPosition(randomTrack.duration_ms);
      setTimeout(async () => {
        await this.seekToPosition(randomPosition);
        // Restore volume after seeking is complete
        setTimeout(() => this.restoreVolume(), 200);
      }, CONFIG.SEEK_DELAY);
    } catch (error) {
      console.error('Error playing random playlist song:', error);
      await this.restoreVolume();
    }
  }

  async playRandomPlaylistSongFromBeginning(playlistId) {
    try {
      console.log(`Playing random playlist song from beginning (playlist: ${playlistId})...`);
      const data = await this.fetchPlaylistTracks(playlistId);
      
      if (!data.items || data.items.length === 0) {
        console.error('No tracks found in playlist for continuous playback');
        this.showError('No tracks found in this playlist.');
        return;
      }

      // Filter out null tracks
      const availableTracks = data.items.filter(item => item.track && item.track.uri);
      
      if (availableTracks.length === 0) {
        console.error('No playable tracks found in playlist');
        this.showError('No playable tracks found in this playlist.');
        return;
      }

      const randomTrack = this.selectRandomTrack(availableTracks);
      
      // Mark as transitioning for smooth MediaSession handling
      this.isTransitioning = true;
      
      // Don't mute for natural progression - just play the track
      await this.playTrack(randomTrack.uri);
      
      this.isTransitioning = false;
      
      console.log('Playlist track started successfully (natural progression)');
    } catch (error) {
      console.error('Error playing random playlist song from beginning:', error);
      this.isTransitioning = false;
      // Reset the ending flag to allow retry
      this.trackEndingProcessed = false;
      
      // Show error to user
      this.showError('Failed to play next track. Trying again...');
      
      // Try once more after a delay
      setTimeout(() => {
        this.playRandomPlaylistSongFromBeginning(playlistId);
      }, 2000);
    }
  }

  async fetchPlaylistMetadata(playlistId, forceRefresh = false) {
    // Check cache first
    const cacheKey = `playlist_meta_${playlistId}`;
    if (!forceRefresh && this.playlistCache[cacheKey] && this.playlistCache[cacheKey].expiresAt > Date.now()) {
      return this.playlistCache[cacheKey].data;
    }

    try {
      console.log(`Fetching playlist metadata for playlist: ${playlistId}`);
      
      const response = await this.fetchWithRetry(
        `https://api.spotify.com/v1/playlists/${playlistId}?fields=name,description,images,tracks.total`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch playlist metadata: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the results for 30 minutes (longer than tracks since metadata changes less frequently)
      this.playlistCache[cacheKey] = {
        data: data,
        expiresAt: Date.now() + 1800000 // 30 minutes
      };
      
      return data;
    } catch (error) {
      console.error('Error fetching playlist metadata:', error);
      // Don't show error to user for metadata failures, just continue
      return null;
    }
  }

  async updateStationCoverImage(stationIndex, playlistId) {
    try {
      const stations = document.querySelectorAll('.station');
      const station = stations[stationIndex];
      if (!station) return;

      const coverElement = station.querySelector('.cover');
      if (!coverElement) return;

      // Add loading state
      coverElement.style.opacity = '0.7';
      coverElement.style.filter = 'blur(1px)';

      // Get playlist metadata
      const metadata = await this.fetchPlaylistMetadata(playlistId);
      if (!metadata || !metadata.images || metadata.images.length === 0) {
        console.log('No cover image found for playlist:', playlistId);
        // Remove loading state
        coverElement.style.opacity = '';
        coverElement.style.filter = '';
        return;
      }

      // Use the largest available image (first one is usually largest)
      const imageUrl = metadata.images[0].url;
      
      // Update the background image with error handling
      const img = new Image();
      img.onload = () => {
        coverElement.style.backgroundImage = `url('${imageUrl}')`;
        // Remove loading state with smooth transition
        coverElement.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
        coverElement.style.opacity = '';
        coverElement.style.filter = '';
        console.log('Updated station cover image from playlist:', metadata.name);
        
        // Remove transition after animation completes
        setTimeout(() => {
          coverElement.style.transition = '';
        }, 300);
      };
      img.onerror = () => {
        console.log('Failed to load playlist cover image, keeping original');
        // Remove loading state
        coverElement.style.opacity = '';
        coverElement.style.filter = '';
      };
      img.src = imageUrl;

    } catch (error) {
      console.error('Error updating station cover image:', error);
      // Remove loading state on error
      const stations = document.querySelectorAll('.station');
      const station = stations[stationIndex];
      if (station) {
        const coverElement = station.querySelector('.cover');
        if (coverElement) {
          coverElement.style.opacity = '';
          coverElement.style.filter = '';
        }
      }
    }
  }

  async preloadStationCoverImages() {
    console.log('Preloading station cover images...');
    
    // Find all playlist-based stations and load their cover images
    const playlistStations = STATIONS.filter(station => 
      station.type === 'playlist' && station.playlistId
    );

    // Load cover images in parallel (but don't wait for all to complete)
    const imagePromises = playlistStations.map(async (station, stationIndex) => {
      try {
        // Find the actual index in the STATIONS array
        const actualIndex = STATIONS.findIndex(s => s.id === station.id);
        if (actualIndex !== -1) {
          await this.updateStationCoverImage(actualIndex, station.playlistId);
        }
      } catch (error) {
        console.log(`Failed to load cover image for station ${station.name}:`, error);
      }
    });

    // Don't await all promises - let them load in background
    Promise.allSettled(imagePromises).then(() => {
      console.log('Finished preloading station cover images');
    });
  }

  async muteForTransition() {
    if (!this.player) return;
    
    try {
      // Get current volume before muting
      const state = await this.player.getCurrentState();
      if (state) {
        await this.player.getVolume().then(volume => {
          this.savedVolume = volume;
          console.log('Saved volume:', this.savedVolume);
        });
      }
      
      // Mute
      await this.player.setVolume(0);
      console.log('Muted for transition');
    } catch (error) {
      console.error('Error muting for transition:', error);
    }
  }

  async restoreVolume() {
    if (!this.player) return;
    
    try {
      // Gradually restore volume for smooth transition
      const targetVolume = this.savedVolume || 0.5;
      
      // Quick fade in
      const steps = CONFIG.VOLUME_FADE_STEPS;
      const stepSize = targetVolume / steps;
      const stepDelay = CONFIG.VOLUME_FADE_DURATION / steps;
      
      for (let i = 1; i <= steps; i++) {
        setTimeout(async () => {
          try {
            await this.player.setVolume(stepSize * i);
            if (i === steps) {
              console.log('Volume restored to:', targetVolume);
            }
          } catch (error) {
            console.error('Error in volume fade:', error);
          }
        }, stepDelay * i);
      }
    } catch (error) {
      console.error('Error restoring volume:', error);
      // Fallback: try to set volume directly
      try {
        await this.player.setVolume(this.savedVolume || 0.5);
      } catch (fallbackError) {
        console.error('Fallback volume restore failed:', fallbackError);
      }
    }
  }

  startContinuousPlaybackMonitor() {
    console.log('Starting continuous playback monitor...');
    
    // Check every 2 seconds for track ending as a failsafe
    setInterval(async () => {
      if (!this.player || !this.continuousPlaybackEnabled) return;
      
      try {
        const state = await this.player.getCurrentState();
        if (!state) return;
        
        const positionMs = state.position;
        const durationMs = state.duration;
        const timeRemainingMs = durationMs - positionMs;
        
        // Log current state if debug is enabled and we're near the end or beginning
        if (CONFIG.DEBUG_PLAYBACK && (timeRemainingMs < 5000 || positionMs < 1000)) {
          console.log(`[Monitor] Track: ${(positionMs/1000).toFixed(1)}/${(durationMs/1000).toFixed(1)}s, Remaining: ${(timeRemainingMs/1000).toFixed(1)}s, Paused: ${state.paused}, Processed: ${this.trackEndingProcessed}`);
        }
        
        // CRITICAL: If track is paused at position 0 and we haven't processed it
        // This catches the exact scenario from the logs
        if (state.paused && positionMs < 500 && !this.trackEndingProcessed) {
          // Check if this is a natural ending (was playing before)
          if (this.previousState && !this.previousState.paused && this.previousState.position > durationMs * 0.8) {
            console.log('[Monitor] CRITICAL: Track ended naturally and reset to 0 while paused - forcing next track');
            this.handleTrackEnding();
            return;
          }
          
          // Also check if we've been stuck at position 0 for multiple checks
          if (this.previousState && this.previousState.paused && this.previousState.position < 500) {
            this.positionStallCount++;
            if (this.positionStallCount > 2) { // Stuck for 6+ seconds
              console.log('[Monitor] CRITICAL: Track stuck at position 0 while paused - forcing next track');
              this.positionStallCount = 0;
              this.handleTrackEnding();
              return;
            }
          } else {
            this.positionStallCount = 0;
          }
        }
        
        // Early trigger: if track is playing and approaching end
        if (!state.paused && timeRemainingMs > 0 && timeRemainingMs < 1200 && !this.trackEndingProcessed) {
          console.log('[Monitor] Track approaching end - triggering early transition');
          this.handleTrackEnding();
          return;
        }
        
        // Fallback: if track is at the very end and hasn't been processed
        if (timeRemainingMs < 500 && !this.trackEndingProcessed) {
          console.log('[Monitor] Failsafe triggered - track near end without processing');
          this.handleTrackEnding();
        }
      } catch (error) {
        console.error('[Monitor] Error checking playback state:', error);
      }
    }, 2000);
  }
}

// Initialize the player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const player = new SpotifyPlayer();
  player.init();
  
  // Expose player instance for debugging
  const nowPlayingContainer = document.querySelector('.now-playing-container');
  if (nowPlayingContainer) {
    nowPlayingContainer.__spotifyPlayer = player;
    console.log('SpotifyPlayer instance exposed on .now-playing-container element for debugging');
  }
  
  // Also expose globally for easier access
  window.__spotifyPlayer = player;
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    player.destroy();
  });
}); 
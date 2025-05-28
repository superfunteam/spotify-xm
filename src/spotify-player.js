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
};

// Station definitions
const STATIONS = [
  { id: 'liked', name: 'Liked Songs', description: 'Your favorite tracks', image: 'stations/station-liked.png' },
  { id: 'oldies', name: 'Golden Oldies', description: 'Classics from the 50s & 60s', image: 'stations/station-oldies.png' },
  { id: '70s', name: 'Groovy 70s', description: 'Hits from the seventies', image: 'stations/station-70s.png' },
  { id: '80s', name: 'Awesome 80s', description: 'The unforgettable eighties', image: 'stations/station-80s.png' },
  { id: '90s', name: '90s Throwback', description: 'Biggest hits of the nineties', image: 'stations/station-90s.png' },
  { id: '2k', name: 'Y2K Hits', description: 'Pop from the 2000s', image: 'placeholder.jpg' },
  { id: 'new', name: 'Fresh Finds', description: 'Latest music releases', image: 'placeholder.jpg' },
  { id: 'party', name: 'Party Bangers', description: 'High-energy anthems', image: 'placeholder.jpg' },
  { id: 'highschool', name: 'HS Rewind', description: 'Your high school soundtrack', image: 'placeholder.jpg' },
  { id: 'talk', name: 'Talk & Podcasts', description: 'News, comedy & stories', image: 'placeholder.jpg' },
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
    this.cacheExpiresAt = null;
    this.retryCount = 0;
    this.isInitializing = false;
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
      nowPlayingArea.style.cursor = 'pointer';
      nowPlayingArea.addEventListener('click', () => this.handleNowPlayingClick());
    }

    // Handle visibility change to pause/resume updates
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseUpdates();
      } else {
        this.resumeUpdates();
      }
    });
  }

  selectStation(index) {
    const stations = document.querySelectorAll('.station');
    const activeRingClasses = ['ring-4', 'ring-pink-300', 'ring-offset-6', 'ring-offset-emerald-900'];
    
    // Remove active state from all stations
    stations.forEach(station => {
      const imageDiv = station.children[0];
      if (imageDiv) {
        imageDiv.classList.remove(...activeRingClasses);
      }
    });

    // Add active state to selected station
    const selectedStation = stations[index];
    if (selectedStation) {
      const imageDiv = selectedStation.children[0];
      if (imageDiv) {
        imageDiv.classList.add(...activeRingClasses);
      }
      
      // Scroll into view
      selectedStation.scrollIntoView({ 
        behavior: CONFIG.STATION_SCROLL_BEHAVIOR, 
        block: 'nearest', 
        inline: 'center' 
      });

      // Update current station
      this.currentStation = STATIONS[index].id;
      
      // Play from the selected station
      this.playFromCurrentStation();
    }
  }

  async playFromCurrentStation() {
    if (!this.accessToken || !this.deviceId) {
      console.warn('Cannot play: missing access token or device ID');
      return;
    }

    // For now, only "liked" station is implemented
    if (this.currentStation === 'liked') {
      await this.playRandomLikedSongAtRandomPosition();
    } else {
      this.showNotification(`${STATIONS.find(s => s.id === this.currentStation)?.name} station coming soon!`);
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
    // Check for track ending
    if (this.previousState && this.isTrackEnding(state, this.previousState)) {
      this.handleTrackEnding();
    }
    
    this.previousState = { ...state };
  }

  isTrackEnding(currentState, previousState) {
    if (!currentState.position || !currentState.duration || 
        !previousState.position || !previousState.duration) {
      return false;
    }

    const currentProgress = (currentState.position / currentState.duration) * 100;
    const previousProgress = (previousState.position / previousState.duration) * 100;
    
    return previousProgress > CONFIG.TRACK_END_THRESHOLD && 
           currentProgress < CONFIG.TRACK_RESET_THRESHOLD && 
           Math.abs(currentState.duration - previousState.duration) < 5000 && 
           !this.trackEndingProcessed;
  }

  handleTrackEnding() {
    console.log('Track ended naturally, playing next song');
    this.trackEndingProcessed = true;
    
    setTimeout(() => {
      this.playRandomLikedSongFromBeginning();
      setTimeout(() => { 
        this.trackEndingProcessed = false; 
      }, 5000);
    }, 1000);
  }

  async onPlayerReady() {
    this.setupMediaSessionHandlers();
    await this.playFromCurrentStation();
  }

  setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) {
      console.log('MediaSession API not supported');
      return;
    }

    console.log('Setting up MediaSession handlers');

    navigator.mediaSession.setActionHandler('play', () => {
      this.player?.resume();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.player?.pause();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.playFromCurrentStation();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.playFromCurrentStation();
    });
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
      const data = await this.fetchLikedSongs();
      
      if (!data.items || data.items.length === 0) {
        this.showError('No liked songs found. Please like some songs on Spotify first.');
        return;
      }

      const randomTrack = this.selectRandomTrack(data.items);
      await this.playTrack(randomTrack.uri);
    } catch (error) {
      console.error('Error playing random liked song:', error);
    }
  }

  async playRandomLikedSongAtRandomPosition() {
    try {
      const data = await this.fetchLikedSongs();
      
      if (!data.items || data.items.length === 0) {
        this.showError('No liked songs found. Please like some songs on Spotify first.');
        return;
      }

      const randomTrack = this.selectRandomTrack(data.items);
      await this.playTrack(randomTrack.uri);

      // Seek to random position after a delay
      const randomPosition = this.calculateRandomPosition(randomTrack.duration_ms);
      setTimeout(() => this.seekToPosition(randomPosition), CONFIG.SEEK_DELAY);
    } catch (error) {
      console.error('Error playing random song at random position:', error);
    }
  }

  selectRandomTrack(tracks) {
    const randomIndex = Math.floor(Math.random() * tracks.length);
    return tracks[randomIndex].track;
  }

  calculateRandomPosition(duration) {
    const minPosition = duration * CONFIG.RANDOM_POSITION_MIN;
    const maxPosition = duration * CONFIG.RANDOM_POSITION_MAX;
    return Math.floor(Math.random() * (maxPosition - minPosition) + minPosition);
  }

  async playTrack(uri) {
    if (!this.deviceId) {
      throw new Error('No device ID available');
    }

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
          uris: [uri]
        })
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to play track: ${response.status}`);
    }
  }

  async ensureDeviceActive() {
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
          play: false
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
      return;
    }

    const { track_window: { current_track }, position, duration } = state;

    // Update cover image
    const coverElement = document.querySelector('.now-playing .cover');
    if (coverElement && current_track.album.images.length > 0) {
      const imageUrl = current_track.album.images[0].url;
      coverElement.style.backgroundImage = `url('${imageUrl}')`;
      
      // Handle image loading errors
      const img = new Image();
      img.onerror = () => {
        coverElement.style.backgroundImage = `url('cover.png')`;
      };
      img.src = imageUrl;
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
  }

  startTimeUpdates() {
    this.pauseUpdates();
    
    this.timeUpdateInterval = setInterval(async () => {
      if (!this.player || document.hidden) return;
      
      try {
        const state = await this.player.getCurrentState();
        if (state && !state.paused) {
          this.updateElapsedTime(state.position, state.duration);
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
  }

  handleNowPlayingClick() {
    if (!this.accessToken || !this.deviceId) {
      console.warn('Cannot skip: missing access token or device ID');
      return;
    }

    // Add visual feedback
    const nowPlayingArea = document.querySelector('.now-playing-container');
    nowPlayingArea?.classList.add('loading');
    
    this.playFromCurrentStation().finally(() => {
      nowPlayingArea?.classList.remove('loading');
    });
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
}

// Initialize the player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const player = new SpotifyPlayer();
  player.init();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    player.destroy();
  });
}); 
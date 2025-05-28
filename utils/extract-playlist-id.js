#!/usr/bin/env node

/**
 * Utility to extract Spotify playlist IDs from various URL formats
 * 
 * Usage: node utils/extract-playlist-id.js <spotify-url>
 * 
 * Supported URL formats:
 * - https://open.spotify.com/playlist/5nCCpeCobBAoF91TwgQetX
 * - https://open.spotify.com/playlist/5nCCpeCobBAoF91TwgQetX?si=42631d25bc594ef2
 * - spotify:playlist:5nCCpeCobBAoF91TwgQetX
 */

function extractPlaylistId(url) {
  if (!url) {
    return null;
  }

  // Handle Spotify URI format (spotify:playlist:ID)
  const uriMatch = url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) {
    return uriMatch[1];
  }

  // Handle Spotify Web URL format
  const urlMatch = url.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // If it's already just an ID (22 characters, alphanumeric)
  if (/^[a-zA-Z0-9]{22}$/.test(url)) {
    return url;
  }

  return null;
}

// CLI usage
if (require.main === module) {
  const url = process.argv[2];
  
  if (!url) {
    console.log('Usage: node extract-playlist-id.js <spotify-url>');
    console.log('\nExamples:');
    console.log('  node extract-playlist-id.js https://open.spotify.com/playlist/5nCCpeCobBAoF91TwgQetX');
    console.log('  node extract-playlist-id.js spotify:playlist:5nCCpeCobBAoF91TwgQetX');
    process.exit(1);
  }

  const playlistId = extractPlaylistId(url);
  
  if (playlistId) {
    console.log('\nPlaylist ID:', playlistId);
    console.log('\nAdd this to your STATIONS configuration:');
    console.log(`{
  id: 'your-station-id',
  name: 'Your Station Name',
  description: 'Your station description',
  image: 'placeholder.jpg',
  type: 'playlist',
  playlistId: '${playlistId}'
}`);
  } else {
    console.error('\nError: Could not extract playlist ID from the provided URL');
    console.error('Make sure you\'re using a valid Spotify playlist URL or URI');
    process.exit(1);
  }
}

module.exports = { extractPlaylistId }; 
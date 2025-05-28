#!/usr/bin/env node

/**
 * Test script for playlist functionality
 * Tests playlist ID extraction and validates configuration
 */

const { extractPlaylistId } = require('../utils/extract-playlist-id.js');

// Test playlist ID extraction
console.log('🧪 Testing Playlist ID Extraction...\n');

const testUrls = [
  'https://open.spotify.com/playlist/5nCCpeCobBAoF91TwgQetX?si=42631d25bc594ef2',
  'https://open.spotify.com/playlist/37i9dQZF1DX4UtSsGT1Sbe',
  'spotify:playlist:5nCCpeCobBAoF91TwgQetX',
  '5nCCpeCobBAoF91TwgQetX',
  'invalid-url',
  ''
];

const expectedResults = [
  '5nCCpeCobBAoF91TwgQetX',
  '37i9dQZF1DX4UtSsGT1Sbe', 
  '5nCCpeCobBAoF91TwgQetX',
  '5nCCpeCobBAoF91TwgQetX',
  null,
  null
];

let allTestsPassed = true;

testUrls.forEach((url, index) => {
  const result = extractPlaylistId(url);
  const expected = expectedResults[index];
  const passed = result === expected;
  
  console.log(`${passed ? '✅' : '❌'} Test ${index + 1}: ${url || '(empty)'}`);
  console.log(`   Expected: ${expected || 'null'}`);
  console.log(`   Got: ${result || 'null'}`);
  
  if (!passed) {
    allTestsPassed = false;
  }
  console.log('');
});

// Test station configuration
console.log('🔧 Validating Station Configuration...\n');

// Read the current stations config (simplified check)
const fs = require('fs');
const path = require('path');

try {
  const playerCode = fs.readFileSync(path.join(__dirname, '../src/spotify-player.js'), 'utf8');
  
  // Check if 90s station has the correct playlist ID
  const has90sPlaylist = playerCode.includes("playlistId: '5nCCpeCobBAoF91TwgQetX'");
  console.log(`${has90sPlaylist ? '✅' : '❌'} 90s station configured with correct playlist ID`);
  
  // Check if station types are properly defined
  const hasStationTypes = playerCode.includes("type: 'playlist'") && playerCode.includes("type: 'liked'");
  console.log(`${hasStationTypes ? '✅' : '❌'} Station types properly defined`);
  
  // Check if new methods exist
  const hasPlaylistMetadata = playerCode.includes('fetchPlaylistMetadata');
  const hasCoverUpdate = playerCode.includes('updateStationCoverImage');
  const hasPreload = playerCode.includes('preloadStationCoverImages');
  
  console.log(`${hasPlaylistMetadata ? '✅' : '❌'} fetchPlaylistMetadata method exists`);
  console.log(`${hasCoverUpdate ? '✅' : '❌'} updateStationCoverImage method exists`);
  console.log(`${hasPreload ? '✅' : '❌'} preloadStationCoverImages method exists`);
  
  if (!has90sPlaylist || !hasStationTypes || !hasPlaylistMetadata || !hasCoverUpdate || !hasPreload) {
    allTestsPassed = false;
  }
  
} catch (error) {
  console.log('❌ Error reading station configuration:', error.message);
  allTestsPassed = false;
}

console.log('\n📋 Test Summary');
console.log('================');
console.log(`Overall result: ${allTestsPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);

if (allTestsPassed) {
  console.log('\n🎉 Your Spotify XM setup looks good!');
  console.log('The 90s station should now display the actual playlist cover art.');
  console.log('\nNext steps:');
  console.log('1. Deploy your app or run it locally');
  console.log('2. Connect to Spotify');
  console.log('3. Select the 90s station to test playlist functionality');
} else {
  console.log('\n⚠️  Please fix the issues above before proceeding.');
}

process.exit(allTestsPassed ? 0 : 1); 
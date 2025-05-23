const querystring = require('querystring');

exports.handler = async function(event, context) {
  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  // This will be your Netlify site URL when deployed, or localhost for local dev
  // Ensure this exact URI is whitelisted in your Spotify Developer Dashboard
  const REDIRECT_URI = `${process.env.URL}/.netlify/functions/spotify-auth-callback`; 

  if (!SPOTIFY_CLIENT_ID) {
    return {
      statusCode: 500,
      body: 'Spotify Client ID not configured. Please set SPOTIFY_CLIENT_ID environment variable.'
    };
  }

  const scopes = [
    'streaming', // Required for Web Playback SDK
    'user-read-email',
    'user-read-private',
    'user-modify-playback-state',
    'user-read-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read',
    'user-library-modify'
    // Add any other scopes your app might need
  ].join(' ');

  const authQueryParameters = querystring.stringify({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: scopes,
    redirect_uri: REDIRECT_URI,
    // state: 'some-random-string' // Optional: for security, generate and verify a random state string
  });

  return {
    statusCode: 302, // Temporary Redirect
    headers: {
      'Location': `https://accounts.spotify.com/authorize?${authQueryParameters}`,
      'Cache-Control': 'no-cache' // Disable caching of this response
    },
    body: '' // body is not required for a redirect
  };
}; 
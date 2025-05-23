const fetch = require('node-fetch');
const querystring = require('querystring');

exports.handler = async function(event, context) {
  const { code, error, state } = event.queryStringParameters;
  // Optional: If you implement state for CSRF protection, retrieve and verify it here.
  // const storedState = event.headers.cookie ? require('cookie').parse(event.headers.cookie).spotify_auth_state : null;
  // if (state === null || state !== storedState) {
  //   return { statusCode: 400, body: JSON.stringify({ error: 'state_mismatch' }) };
  // }

  if (error) {
    console.error('Spotify authorization error:', error);
    // Redirect to frontend with error information
    const errorRedirectUrl = `${process.env.URL}/#error=${encodeURIComponent(error)}`;
    return {
      statusCode: 302,
      headers: { 'Location': errorRedirectUrl, 'Cache-Control': 'no-cache' },
      body: ''
    };
  }

  if (!code) {
    const errorRedirectUrl = `${process.env.URL}/#error=no_code_provided`;
    return {
        statusCode: 302,
        headers: { 'Location': errorRedirectUrl, 'Cache-Control': 'no-cache' },
        body: ''
    };
  }

  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  // Ensure this REDIRECT_URI exactly matches what's in your Spotify Dashboard and sent by spotify-auth-login.js
  const REDIRECT_URI = `${process.env.URL}/.netlify/functions/spotify-auth-callback`;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('Spotify client ID or secret not configured for callback.');
    const errorRedirectUrl = `${process.env.URL}/#error=server_config_error`;
    return {
        statusCode: 302,
        headers: { 'Location': errorRedirectUrl, 'Cache-Control': 'no-cache' },
        body: ''
    };
  }

  const authHeader = 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Spotify token exchange error:', data);
      const errorRedirectUrl = `${process.env.URL}/#error=${encodeURIComponent(data.error || 'token_exchange_failed')}`;
      return {
        statusCode: 302,
        headers: { 'Location': errorRedirectUrl, 'Cache-Control': 'no-cache' },
        body: ''
      };
    }

    const { access_token, refresh_token, expires_in } = data;
    
    // Redirect to the frontend, passing tokens in the URL hash.
    // The frontend will then parse these from the hash.
    let successRedirectUrl = `${process.env.URL}/#access_token=${encodeURIComponent(access_token)}&expires_in=${encodeURIComponent(expires_in)}`;
    if (refresh_token) {
      successRedirectUrl += `&refresh_token=${encodeURIComponent(refresh_token)}`;
    }

    return {
      statusCode: 302,
      headers: {
        'Location': successRedirectUrl,
        'Cache-Control': 'no-cache' 
      },
      body: ''
    };

  } catch (e) {
    console.error('Token exchange exception:', e);
    const errorRedirectUrl = `${process.env.URL}/#error=token_exception`;
    return {
        statusCode: 302,
        headers: { 'Location': errorRedirectUrl, 'Cache-Control': 'no-cache' },
        body: ''
    };
  }
}; 
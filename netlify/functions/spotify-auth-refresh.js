const fetch = require('node-fetch');
const querystring = require('querystring');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  const { refresh_token } = body;

  if (!refresh_token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing refresh_token' })
    };
  }

  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error('Spotify client ID or secret not configured.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' })
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
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Spotify token refresh error:', data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: data.error || 'Token refresh failed',
          error_description: data.error_description
        })
      };
    }

    // Return the new access token
    // Note: Spotify may or may not return a new refresh token
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token || refresh_token, // Use existing if not provided
        scope: data.scope
      })
    };

  } catch (error) {
    console.error('Token refresh exception:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 
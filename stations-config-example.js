/**
 * Example Station Configuration for Spotify XM
 * 
 * Copy the stations you want to use into src/spotify-player.js
 * Replace the playlistId values with your own Spotify playlist IDs
 * 
 * To get a playlist ID:
 * 1. Right-click on a playlist in Spotify and select "Share" > "Copy link to playlist"
 * 2. Run: node utils/extract-playlist-id.js <paste-url-here>
 */

const EXAMPLE_STATIONS = [
  { 
    id: 'liked', 
    name: 'Liked Songs', 
    description: 'Your favorite tracks', 
    image: 'stations/station-liked.png',
    type: 'liked' // Special type - no playlistId needed
  },
  
  { 
    id: 'oldies', 
    name: 'Golden Oldies', 
    description: 'Classics from the 50s & 60s', 
    image: 'stations/station-oldies.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DXaKIA8E7WcJj' // Spotify's "All Out 50s" playlist
  },
  
  { 
    id: '70s', 
    name: 'Groovy 70s', 
    description: 'Hits from the seventies', 
    image: 'stations/station-70s.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DWTJ7xPn4vNaz' // Spotify's "All Out 70s" playlist
  },
  
  { 
    id: '80s', 
    name: 'Awesome 80s', 
    description: 'The unforgettable eighties', 
    image: 'stations/station-80s.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DX4UtSsGT1Sbe' // Spotify's "All Out 80s" playlist
  },
  
  { 
    id: '90s', 
    name: '90s Throwback', 
    description: 'Biggest hits of the nineties', 
    image: 'stations/station-90s.png',
    type: 'playlist',
    playlistId: '5nCCpeCobBAoF91TwgQetX' // Your custom 90s playlist
  },
  
  { 
    id: '2k', 
    name: 'Y2K Hits', 
    description: 'Pop from the 2000s', 
    image: 'stations/station-2k.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DX4o1oenSJRJd' // Spotify's "All Out 00s" playlist
  },
  
  { 
    id: 'new', 
    name: 'Fresh Finds', 
    description: 'Latest music releases', 
    image: 'stations/station-new.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DXcBWIGoYBM5M' // Spotify's "Today's Top Hits"
  },
  
  { 
    id: 'party', 
    name: 'Party Bangers', 
    description: 'High-energy anthems', 
    image: 'stations/station-party.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DXaXB8fQg7xif' // Spotify's "Dance Party"
  },
  
  { 
    id: 'highschool', 
    name: 'HS Rewind', 
    description: 'Your high school soundtrack', 
    image: 'stations/station-hs.png',
    type: 'playlist',
    playlistId: null // Add your own high school era playlist
  },
  
  { 
    id: 'chill', 
    name: 'Chill Vibes', 
    description: 'Relaxing background music', 
    image: 'stations/station-chill.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DWTvNyxOwkztu' // Spotify's "Chill Hits"
  },

  { 
    id: 'rock', 
    name: 'Rock Classics', 
    description: 'Timeless rock anthems', 
    image: 'stations/station-rock.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DWXRqgorJj26U' // Spotify's "Rock Classics"
  },

  { 
    id: 'indie', 
    name: 'Indie Mix', 
    description: 'Alternative & indie favorites', 
    image: 'stations/station-indie.png',
    type: 'playlist',
    playlistId: '37i9dQZF1DX2Nc3B70tvx0' // Spotify's "Ultimate Indie"
  }
];

/**
 * Popular Spotify Editorial Playlists IDs for reference:
 * 
 * Decades:
 * - All Out 50s: 37i9dQZF1DXaKIA8E7WcJj
 * - All Out 60s: 37i9dQZF1DXaUbGMLUKHxe
 * - All Out 70s: 37i9dQZF1DWTJ7xPn4vNaz
 * - All Out 80s: 37i9dQZF1DX4UtSsGT1Sbe
 * - All Out 90s: 37i9dQZF1DXbTxeAdrVG2l
 * - All Out 00s: 37i9dQZF1DX4o1oenSJRJd
 * - All Out 10s: 37i9dQZF1DX5Ejj0EKORtw
 * 
 * Genres:
 * - Today's Top Hits: 37i9dQZF1DXcBWIGoYBM5M
 * - RapCaviar: 37i9dQZF1DX0XUsuxWHRQd
 * - Rock This: 37i9dQZF1DXcF6B6QPhFDv
 * - mint: 37i9dQZF1DX4dyzvuaRJ0n
 * - Dance Party: 37i9dQZF1DXaXB8fQg7xif
 * - Chill Hits: 37i9dQZF1DWTvNyxOwkztu
 * 
 * Moods:
 * - Mood Booster: 37i9dQZF1DX3rxVfibe1L0
 * - Feelin' Good: 37i9dQZF1DX3YSRoSdA634
 * - Deep Focus: 37i9dQZF1DWZeKCadgRdKQ
 * - Peaceful Piano: 37i9dQZF1DX4sWSpwq3LiO
 */ 
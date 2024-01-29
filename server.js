const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: 'http://localhost:3001/callback',
});


app.use(cors());
app.use(express.json());

app.get('/login', (req, res) => {
    const redirect_uri = 'http://localhost:3001/callback';
    const scope = 'user-read-private user-read-email user-top-read playlist-modify-public';

    const spotifyAuthUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: process.env.SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: redirect_uri,
        });

    console.log('Redirecting to Spotify for authentication:', spotifyAuthUrl);
    res.json({ url: spotifyAuthUrl });
});

app.get('/callback', async (req, res) => {
    
    // Handle Spotify callback, exchange code for access token
    const code = req.query.code || null;
    const redirect_uri = 'http://localhost:3001/callback';

    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code',
        },
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        },
        json: true,
    };

    try {
        console.log('Exchanging code for access token:', authOptions);
        const response = await axios.post(authOptions.url, querystring.stringify(authOptions.form), {
            headers: authOptions.headers,
        });

        // Handle the response and create a playlist
        const access_token = response.data.access_token;
        console.log('Access token received:', access_token);
        spotifyApi.setAccessToken(access_token);

        // Call Spotify API to get the user's top tracks
        const topTracksResponse = await axios.get('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=100', {
            headers: {
                'Authorization': 'Bearer ' + access_token,
            },
        });
        console.log('Top Tracks Response:', topTracksResponse.data);

        const trackIds = topTracksResponse.data.items.map(track => track.id);



        const audioFeaturesResponse = await spotifyApi.getAudioFeaturesForTracks(trackIds);
        console.log('finished audiofeaturesresponse')
        console.log('Audio Features Response:', audioFeaturesResponse);

        // Check if 'audio_features' property is present in the response body
        if (audioFeaturesResponse && audioFeaturesResponse.body && audioFeaturesResponse.body.audio_features) {
            const audioFeatures = audioFeaturesResponse.body.audio_features;
            console.log('Top Tracks Audio Features:', audioFeatures);
        } else {
            console.error('Error: Invalid or missing audio features in the response.');
            console.error('Full response:', audioFeaturesResponse);
        }


        // Extract danceability values from top tracks
        const danceabilityValues = audioFeaturesResponse.body.audio_features.map(feature => feature.danceability);

        console.log('Audio Features:', danceabilityValues);
        console.log('Danceability values:', danceabilityValues);

        // Create a playlist with the danceable tracks
        if (danceabilityValues.length > 0) {
            const createPlaylistResponse = await axios.post(
                'https://api.spotify.com/v1/me/playlists',
                {
                    name: 'Danceable Tracks Playlist', // Customize the playlist name
                    description: "New playlist description",
                    public: true,
                },
                {
                    headers: {
                        'Authorization': 'Bearer ' + access_token,
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Define a threshold for danceability
            const danceabilityThreshold = 0.8; 
            const highDanceabilityTracks = audioFeaturesResponse.body.audio_features.filter(feature => feature.danceability > danceabilityThreshold);
            const trackIds = highDanceabilityTracks.map(feature => feature.id);
            const trackUris = trackIds.map(trackId => `spotify:track:${trackId}`);

            console.log("trackUris: ", trackUris)
            const playlistId = createPlaylistResponse.data.id;
            console.log("playlistId: ", playlistId)

            // Add danceable tracks to the playlist
            const addTracksResponse = await axios.post(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                {
                    uris: trackUris,
                },
                {
                    headers: {
                        'Authorization': 'Bearer ' + access_token,
                        'Content-Type': 'application/json',
                    },
                }
            );

            console.log('Playlist created successfully:', createPlaylistResponse.data);
            console.log('Tracks added to the playlist:', addTracksResponse.data);

            res.send(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Spotify Playlist</title>
              </head>
              <body>
                <iframe
                  title="Spotify Embed: Recommendation Playlist"
                  src="https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0"
                  width="100%"
                  height="100%"
                  style="min-height: 760px;"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                ></iframe>
              </body>
            </html>
          `);

        } else {
            console.error('No danceable tracks found.');
            res.status(400).send('No danceable tracks found.');
        }
    } catch (error) {
        console.error('Error during callback:', error);

        if (error.response && error.response.data && error.response.data.error) {
            console.error('Spotify API error:', error.response.data.error);
        }
    
        res.status(500).send('Error during callback: ' + error.message);
    }
});




app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

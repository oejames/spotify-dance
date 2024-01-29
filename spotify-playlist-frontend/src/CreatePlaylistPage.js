import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CreatePlaylistPage = () => {
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Check if the access token is available in the URL (coming from the callback)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Use the code to obtain the access token
      axios.post('http://localhost:3001/callback', { code })
        .then(response => {
          setAccessToken(response.data.access_token);
          // Optional: You can redirect the user back to the homepage or another page after setting the access token.
          // window.location = '/';
        })
        .catch(error => {
          console.error('Error getting access token:', error);
        });
    }
  }, []);

  // Handle creating the playlist using the access token
  const handleCreatePlaylist = async () => {
    try {
      // Check if the access token is available
      if (accessToken) {
        // Make a request to create a playlist using the obtained access token
        const response = await axios.post('http://localhost:3001/create-playlist', { access_token: accessToken });
        console.log('Playlist created successfully:', response.data);
      } else {
        console.error('Access token is missing. Please log in first.');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  return (
    <div className="CreatePlaylistPage">
      <header className="App-header">
        <h1>Create Playlist Page</h1>
        <button onClick={handleCreatePlaylist}>Create Playlist</button>
      </header>
    </div>
  );
};

export default CreatePlaylistPage;

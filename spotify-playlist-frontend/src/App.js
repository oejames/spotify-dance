import React from 'react';
import axios from 'axios';

function App() {
  const handleLogin = () => {
    axios.get('http://localhost:3001/login')
      .then(response => {
        console.log('Received redirect URL:', response.data.url);
        window.location = response.data.url;
      })
      .catch(error => {
        console.error('Error during login:', error);
      });
  };

  //im thinking probably just implement a constHandleCallback which would be the screen 
  //that you're automatically taken to after login, and have it actually show
  //the playlist like with the spotify frame thingy
  return (
    <div className="App">
      <header className="App-header">
        <h1>Spotify Playlist App</h1>
        <h2>Hit "Login" to save a playlist of your most dance-able tracks</h2>
        <button onClick={handleLogin}>Login with Spotify</button>
      </header>
    </div>
  );
}

export default App;

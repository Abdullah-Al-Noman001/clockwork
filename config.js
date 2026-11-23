/* Your media. Paths are relative to index.html. Users can also add files from inside the app.
   If a file is missing, the built-in generated sound plays instead. */
window.CLOCKWORK_CONFIG = {
  ambience: {
    rain: 'sounds/Rain.opus',
    wind: 'sounds/wind.opus',
  },

  // Default music (shows up as the "Default" playlist)
  tracks: [
    // 'music/my-track.mp3',
    // { name: 'Custom title', src: 'music/another.ogg' },
  ],

  // Named playlists
  playlists: {
    // 'Deep work': ['music/a.mp3', 'music/b.mp3'],
  },
};

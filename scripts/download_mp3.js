import https from 'https';
import fs from 'fs';

const url = 'https://actions.google.com/sounds/v1/water/rain_on_roof.ogg'; // or a known mp3
// Let's use a known public mp3
const urlMp3 = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';

const file = fs.createWriteStream('./public/audio/bgm.mp3');
https.get('https://audio-previews.elements.envatousercontent.com/files/103682271/preview.mp3', function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close(); 
    console.log("Downloaded valid mp3");
  });
});

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const srcDir = path.join(__dirname);
const destFile = path.join(__dirname, 'PMO_Offline_Deploy.zip');

const output = fs.createWriteStream(destFile);
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function() {
  console.log('ZIP created successfully! Total bytes: ' + archive.pointer());
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Append files from the source directory, ignoring node_modules in the root (but keeping server/node_modules if present), .git, etc.
archive.glob('**/*', {
  cwd: srcDir,
  ignore: ['PMO_Offline_Deploy.zip', '.git/**', 'react-app/node_modules/**', 'temp/**', '**/pmo_data.db.lock']
});

archive.finalize();

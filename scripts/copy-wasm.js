const fs = require('fs');
const path = require('path');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Copy WASM file
const wasmSource = path.join(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
const wasmDest = path.join(publicDir, 'sql-wasm.wasm');

fs.copyFileSync(wasmSource, wasmDest);
console.log('Copied sql-wasm.wasm to public directory'); 
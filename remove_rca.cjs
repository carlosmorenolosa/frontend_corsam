const fs = require('fs');
const file = 'C:\\Users\\carlo\\Documents\\CORSAM\\frontend_corsam\\src\\DashboardObra.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find the section to remove
const startMarker = '{/* ╭──────────────── ROOT CAUSE ANALYSIS';
const endMarker = '{/* ╰────────────────────────────────────────────╯ */}\n\n      {/* ╭──────────────── COST STRUCTURE';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

console.log('Start marker found at:', startIdx);
console.log('End marker found at:', endIdx);

if (startIdx === -1 || endIdx === -1) {
  console.log('ERROR: Could not find markers');
  process.exit(1);
}

// Remove the section entirely
const newContent = content.substring(0, startIdx) + content.substring(endIdx + endMarker.length);

fs.writeFileSync(file, newContent, 'utf8');
console.log('SUCCESS: Section removed');
console.log('Old length:', content.length);
console.log('New length:', newContent.length);

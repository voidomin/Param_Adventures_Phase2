const fs = require('fs');
let content = fs.readFileSync('results.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
const results = JSON.parse(content);
const failingFiles = new Set();
results.testResults.forEach(tr => {
    if (tr.status === 'failed') {
        failingFiles.add(tr.name);
    }
});
console.log('Failing Test Files:');
Array.from(failingFiles).forEach(f => console.log(f));

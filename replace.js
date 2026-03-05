const fs = require('fs');
const path = require('path');
const dir = require('path').resolve(__dirname, '../src');

function walk(directory) {
    let results = [];
    const list = fs.readdirSync(directory);
    list.forEach(file => {
        file = path.join(directory, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

walk(dir).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('glass-panel')) {
        content = content.replace(/glass-panel/g, 'arcade-panel');
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
console.log('Finished replacing panels');

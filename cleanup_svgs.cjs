const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'public/assets');
const files = fs.readdirSync(assetsDir).filter(f => f.startsWith('Meeple_') && f.endsWith('.svg'));

const bgRect = 'M0 0 C215.16 0 430.32 0 652 0 C652 207.24 652 414.48 652 628 C436.84 628 221.68 628 0 628 C0 420.76 0 213.52 0 0 Z ';

files.forEach(file => {
    const filePath = path.join(assetsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Identify the first path (solid background)
    const pathRegex = /<path d="([^"]+)" fill="([^"]+)"[^>]*\/>/g;
    const paths = [];
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
        paths.push({ full: match[0], d: match[1], fill: match[2] });
    }

    if (paths.length < 2) return;

    const firstPath = paths[0];
    const secondPath = paths[1];

    // Check if first path is the background rectangle
    if (firstPath.d.trim() === bgRect.trim()) {
        const mainColor = firstPath.fill;
        
        // Check if second path is the white surround with a hole
        if (secondPath.d.includes(bgRect)) {
            // Extract the hole (everything after the first Z of the background rect)
            const holeD = secondPath.d.replace(bgRect, '').trim();
            
            // Create the new meeple base path
            const newBase = `<path d="${holeD}" fill="${mainColor}" transform="translate(0,0)"/>`;
            
            // Remove the first two paths and insert the new base
            let newContent = content.replace(firstPath.full, '');
            newContent = newContent.replace(secondPath.full, newBase);
            
            fs.writeFileSync(filePath, newContent);
            console.log(`Cleaned up ${file}`);
        }
    }
});

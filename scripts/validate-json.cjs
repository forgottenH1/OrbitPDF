const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');

function validateJsonFiles(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            validateJsonFiles(filePath);
        } else if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                JSON.parse(content);
                console.log(`✅ Valid: ${filePath}`);
            } catch (error) {
                console.error(`❌ Invalid: ${filePath}`);
                console.error(`   Error: ${error.message}`);
            }
        }
    });
}

console.log('Validating localization files...');
validateJsonFiles(localesDir);

const fs = require('fs');

const files = [
    'e:/pj_cnm/New folder/CNM_PROJECT_ZOLO_CHAT_ONLINE/frontend/src/locales/en.json',
    'e:/pj_cnm/New folder/CNM_PROJECT_ZOLO_CHAT_ONLINE/frontend/src/locales/vi.json'
];

files.forEach(file => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${file} is valid JSON`);
    } catch (err) {
        console.error(`❌ ${file} is INVALID JSON: ${err.message}`);
    }
});

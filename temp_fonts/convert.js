const fs = require('fs');
const path = require('path');

function convertToBase64(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const file = fs.readFileSync(filePath);
    return file.toString('base64');
}

const regular = convertToBase64(path.join(__dirname, 'NotoSans-Regular.ttf'));
const bold = convertToBase64(path.join(__dirname, 'NotoSans-Bold.ttf')) || regular;

if (!regular) {
    console.error('No font found!');
    process.exit(1);
}

const output = `
export const NOTO_SANS_REGULAR = "${regular}";
export const NOTO_SANS_BOLD = "${bold}";
`;

fs.writeFileSync(path.join(__dirname, '..', 'lib', 'colorByNumber', 'fonts.ts'), output);
console.log('Fonts converted and saved to lib/colorByNumber/fonts.ts');

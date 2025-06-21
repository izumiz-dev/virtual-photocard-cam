import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// SVGをPNGに変換する関数（ブラウザ環境での変換）
function createIconHTML(size) {
  const svgContent = readFileSync(join('public', 'icon.svg'), 'utf8');
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Icon Generator ${size}x${size}</title>
</head>
<body>
    <canvas id="canvas" width="${size}" height="${size}"></canvas>
    
    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        const svg = \`${svgContent.replace('viewBox="0 0 192 192"', `viewBox="0 0 192 192" width="${size}" height="${size}"`)}\`;
        const img = new Image();
        
        img.onload = function() {
            ctx.drawImage(img, 0, 0, ${size}, ${size});
            
            // ダウンロード
            const link = document.createElement('a');
            link.download = 'icon-${size}.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('Icon ${size}x${size} generated');
        };
        
        const blob = new Blob([svg], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        img.src = url;
    </script>
</body>
</html>`;
}

// 各サイズのHTML生成
writeFileSync('public/generate-icon-192.html', createIconHTML(192));
writeFileSync('public/generate-icon-512.html', createIconHTML(512));

console.log('Icon generation HTML files created:');
console.log('- Open public/generate-icon-192.html in browser to generate 192x192 icon');
console.log('- Open public/generate-icon-512.html in browser to generate 512x512 icon');
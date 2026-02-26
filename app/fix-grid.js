import { readFileSync, writeFileSync } from 'fs';

let content = readFileSync('d:/giatsayonline/app/src/pages/baocao/BaoCaoPage.tsx', 'utf-8');

// Replace import
content = content.replace('Grid2 as Grid', 'Grid');

// Replace all size={} with item {...} equivalents
content = content.replace(/size=\{\{\s*xs:\s*12,\s*sm:\s*4\s*\}\}/g, 'item xs={12} sm={4}');
content = content.replace(/size=\{\{\s*xs:\s*6,\s*md:\s*3\s*\}\}/g, 'item xs={6} md={3}');
content = content.replace(/size=\{\{\s*xs:\s*4\s*\}\}/g, 'item xs={4}');
content = content.replace(/size=\{\{\s*xs:\s*12,\s*md:\s*7\s*\}\}/g, 'item xs={12} md={7}');
content = content.replace(/size=\{\{\s*xs:\s*12,\s*md:\s*5\s*\}\}/g, 'item xs={12} md={5}');

writeFileSync('d:/giatsayonline/app/src/pages/baocao/BaoCaoPage.tsx', content);
console.log('Fixed Grid mapping in BaoCaoPage.tsx');

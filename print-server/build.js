/**
 * Build script: Minify + Obfuscate server.js
 * Does NOT bundle dependencies (they stay in node_modules)
 * Output: build/server.bundle.js (obfuscated)
 */
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, 'build');

async function build() {
  console.log('🔒 [1/2] Obfuscating source code...');

  if (!fs.existsSync(BUILD_DIR)) fs.mkdirSync(BUILD_DIR, { recursive: true });

  const rawCode = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

  const obfuscated = JavaScriptObfuscator.obfuscate(rawCode, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.4,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.15,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: false,
    shuffleStringArray: true,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.4,
    // IMPORTANT: keep these OFF to preserve path strings and config keys
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    // Preserve require() calls and Node.js globals
    reservedNames: [
      'require', 'module', 'exports', '__dirname', '__filename',
      'process', 'Buffer', 'console', 'setTimeout', 'setInterval',
      'clearTimeout', 'clearInterval', 'Promise',
    ],
    reservedStrings: [
      'firebase-admin', 'dotenv', 'path', 'fs', 'os', 'readline',
      'pdf-to-printer', 'pdfkit', 'bwip-js', 'child_process',
      'serviceAccountKey\\.json', '\\.env',
    ],
    target: 'node',
  });

  const finalCode = obfuscated.getObfuscatedCode();
  fs.writeFileSync(path.join(BUILD_DIR, 'server.bundle.js'), finalCode, 'utf8');

  const originalSize = fs.statSync('server.js').size;
  const bundledSize = fs.statSync(path.join(BUILD_DIR, 'server.bundle.js')).size;

  console.log('   ✅ Obfuscation complete');
  console.log(`\n📊 [2/2] Results:`);
  console.log(`   Original:   ${(originalSize / 1024).toFixed(1)} KB`);
  console.log(`   Obfuscated: ${(bundledSize / 1024).toFixed(1)} KB`);
  console.log(`\n✅ Output: build/server.bundle.js`);
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});

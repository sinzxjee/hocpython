import { mkdir, copyFile, cp, writeFile } from 'node:fs/promises';
const files = ['index.html', 'app.js', 'bank.js', 'practice.js', 'style.css', 'worker.js', 'runner-core.js', 'icon.svg'];
await mkdir(new URL('../docs/', import.meta.url), { recursive: true });
for (const file of files) await copyFile(new URL('../public/' + file, import.meta.url), new URL('../docs/' + file, import.meta.url));
await cp(new URL('../public/vendor/monaco/', import.meta.url), new URL('../docs/vendor/monaco/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/.nojekyll', import.meta.url), '');
console.log('GitHub Pages files built in docs/');

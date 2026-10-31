const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
for(const name of ['index.html','styles.css','engine.js','app.js','icon.svg'])fs.copyFileSync(path.join(root,name),path.join(root,'dist',name));
console.log('Static preview copied to dist. GitHub Pages can serve the source files directly.');

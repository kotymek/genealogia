const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/genealogia.json'),'utf8'));
if(data.privateWorkingCopy||data.families||data.sources)throw Error('Publiczny pakiet musi używać wyłącznie dotychczasowego, zatwierdzonego zbioru.');
fs.writeFileSync(path.join(root,'data/atlas-data.js'),'// Publiczny zbiór: wygenerowano z data/genealogia.json.\nwindow.ATLAS_DATA = '+JSON.stringify(data)+';\n');
console.log(`Publiczny pakiet: ${data.people.length} osób, ${data.events.length} wydarzeń.`);

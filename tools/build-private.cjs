// Pełna wersja zostaje poza repozytorium. Nie wykonuje połączeń sieciowych.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {convert,selfTest}=require('./import-gedcom.cjs');
const [gedcom,coordinates,destination]=process.argv.slice(2);
if(!gedcom||!coordinates||!destination)throw Error('Użycie: node tools/build-private.cjs drzewo.ged miejsca.json katalog-poza-repozytorium');
const root=path.resolve(__dirname,'..'),out=path.resolve(destination),relative=path.relative(root,out);
if(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative))throw Error('Prywatny atlas musi być zapisany poza repozytorium.');
selfTest();
const bytes=fs.readFileSync(gedcom);
const joined=bytes.toString('latin1').replace(/\r?\n\d+ CONC(?: |(?=\r?$))/gm,'');
const result=convert(new TextDecoder('utf8',{fatal:true}).decode(Buffer.from(joined,'latin1')));
const places=JSON.parse(fs.readFileSync(coordinates,'utf8').replace(/^\uFEFF/,''));
const byId=new Map(),byName=new Map();
for(const p of places){if(byId.has(p.id))throw Error('Powtórzony identyfikator miejsca: '+p.id);byId.set(p.id,p);byName.set(p.name.trim().toLowerCase(),p);if((p.lat!=null||p.lon!=null)&&(!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||Math.abs(p.lat)>90||Math.abs(p.lon)>180))throw Error('Niepoprawne współrzędne: '+p.name);}
for(const p of result.data.places){const match=byId.get(p.id)||byName.get(p.name.trim().toLowerCase());if(match&&Number.isFinite(match.lat)&&Number.isFinite(match.lon)){p.lat=match.lat;p.lon=match.lon;p.status='user_supplied';}else p.status='needs_geocoding';}
// eventIds w starym pliku służą tylko jako informacja: nowy eksport może mieć inną kolejność zdarzeń.
const coordById=new Map(result.data.places.map(p=>[p.id,p]));
for(const e of result.data.events){const p=coordById.get(e.placeId);e.lat=p?.lat??null;e.lon=p?.lon??null;}
result.data.privateWorkingCopy=true;result.data.publicationReady=false;
const mapped=result.data.places.filter(p=>p.lat!==null),missing=result.data.places.filter(p=>p.lat===null);
const report={...result.stats,mappedPlaces:mapped.length,mappedEvents:result.data.events.filter(e=>e.lat!==null).length,missingPlaces:missing.map(p=>({id:p.id,name:p.name,events:p.eventIds.length})),issues:result.issues,sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex')};
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'data'),{recursive:true});
for(const name of ['index.html','style.css','script.js','atlas-core.js','favicon.svg'])fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.cpSync(path.join(root,'vendor'),path.join(out,'vendor'),{recursive:true});
const layerFiles={congress:'krolestwo-polskie-1830.geojson',republic:'ii-rp.geojson',crown:'korona-xviw.geojson',correction:'granica_korony_nowa_marchia_krzyz_1564_65.geojson'};
const layers=Object.fromEntries(Object.entries(layerFiles).map(([key,name])=>[key,JSON.parse(fs.readFileSync(path.join(root,'data/granice',name),'utf8'))]));
fs.writeFileSync(path.join(out,'data/atlas-data.js'),'// Prywatne dane lokalne. Nie publikować.\nwindow.ATLAS_DATA = '+JSON.stringify(result.data)+';\nwindow.ATLAS_LAYERS = '+JSON.stringify(layers)+';\n');
fs.writeFileSync(path.join(out,'raport-importu.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(out,'miejscowosci-do-uzupelnienia.json'),JSON.stringify(missing,null,2)+'\n');
fs.writeFileSync(path.join(out,'CZYTAJ-MNIE.txt'),`ATLAS RODZINNY — WERSJA PRYWATNA\n\nOtwórz index.html w przeglądarce (dwuklik). Nie potrzebujesz instalacji ani serwera.\nKatalog, karty i oś czasu działają z lokalnych plików. Internet jest potrzebny do podkładu mapy.\nPrzeglądarka pobiera kafelki mapowe; nie wysyłamy nazwisk, GEDCOM-a ani notatek.\n\nPełne dane: ${report.people} osób, ${report.families} rodzin.\nWspółrzędne użytkownika: ${report.mappedPlaces} miejsc, ${report.mappedEvents} wpisów.\n${missing.length} nazw miejsc wymaga dalszego uzupełnienia (osobny plik JSON).\n\nNie kopiuj tego katalogu do publicznego repozytorium lub hostingu.\nTo pliki z pełnym drzewem, a nie witryna zabezpieczona hasłem.\nWyszukiwanie: nazwisko, imię lub miejscowość; znak / ustawia kursor w polu wyszukiwania.\nWidoki: Mapa, Osoby, Miejsca, Oś czasu. Escape zamyka szczegóły.\nPasek czasu filtruje dekadę. Filtry pozwalają uwzględnić daty nieznane.\nPrzybliżone daty są zachowane; połączenia miejsc nie są potwierdzonymi trasami podróży.\nŹródła i współrzędne nie zostały zweryfikowane historycznie.\n`,'utf8');
console.log(JSON.stringify({people:report.people,families:report.families,mappedPlaces:report.mappedPlaces,mappedEvents:report.mappedEvents,missingPlaces:report.missingPlaces},null,2));

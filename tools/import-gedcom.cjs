// Lokalny importer GEDCOM 5.5.1, bez zależności i połączeń sieciowych.
// node importuj-gedcom.cjs plik.ged katalog-wynikowy
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const all = (n, tag) => n.children.filter(c => c.tag === tag);
const one = (n, tag) => all(n, tag)[0];
function text(n) {
  if (!n) return '';
  return n.value + n.children.filter(c => ['CONT', 'CONC'].includes(c.tag))
    .map(c => (c.tag === 'CONT' ? '\n' : '') + text(c)).join('');
}
const value = (n, tag) => text(one(n, tag));
const ref = s => /^@[^@]+@$/.test(s) ? s.slice(1, -1) : null;
const refs = (n, tag) => all(n, tag).map(x => ref(x.value)).filter(Boolean);
const months = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12,
  STY:1,LUT:2,MAJ:5,CZE:6,LIP:7,SIE:8,WRZ:9,'PAŹ':10,PAZ:10,LIS:11,GRU:12 };
function simpleDate(raw) {
  const m = raw.toUpperCase().match(/^(?:(\d{1,2})\s+)?(?:([A-ZĄĆĘŁŃÓŚŹŻ]{3})\s+)?(\d{3,4})$/);
  if (!m || (m[1] && !m[2]) || (m[2] && !months[m[2]])) return null;
  const year = +m[3], month = m[2] ? months[m[2]] : null, day = m[1] ? +m[1] : null;
  if (day && (day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate())) return null;
  return {year, month, day, precision: day ? 'day' : month ? 'month' : 'year'};
}
function parseDate(raw) {
  if (!raw) return {raw:'', kind:'unknown', year:null};
  const s = raw.trim();
  const exact = simpleDate(s);
  if (exact) return {raw,kind:'exact',...exact};
  const q = s.match(/^(ABT|CAL|EST|BEF|AFT)\s+(.+)$/i);
  if (q && simpleDate(q[2])) return {raw,kind:{ABT:'approximate',CAL:'calculated',EST:'estimated',BEF:'before',AFT:'after'}[q[1].toUpperCase()],...simpleDate(q[2])};
  const r = s.match(/^(BET|FROM)\s+(.+)\s+(AND|TO)\s+(.+)$/i);
  if (r && ((r[1].toUpperCase()==='BET' && r[3].toUpperCase()==='AND') || (r[1].toUpperCase()==='FROM' && r[3].toUpperCase()==='TO')) && simpleDate(r[2]) && simpleDate(r[4]))
    return {raw,kind:r[1].toUpperCase()==='BET'?'range':'period',year:null,start:simpleDate(r[2]),end:simpleDate(r[4])};
  return {raw,kind:'unparsed',year:null};
}
function parse(input) {
  const root = {children:[]}; const stack = [root]; const errors = [];
  for (const [i, line] of input.replace(/^\uFEFF/,'').split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const m = line.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/);
    if (!m) {
      const previous=stack[stack.length-1];
      if(previous && ['TEXT','NOTE','CONT','CONC'].includes(previous.tag)) {
        previous.children.push({id:null,tag:'CONT',value:line,children:[],line:i+1});
        errors.push({line:i+1,problem:'Odzyskano wiersz tekstu bez numeru poziomu',recovered:true});
      } else errors.push({line:i+1,problem:'Niepoprawna składnia',raw:line});
      continue;
    }
    const level = +m[1];
    const node = {id:m[2]?ref(m[2]):null,tag:m[3],value:m[4]||'',children:[],line:i+1};
    if (!stack[level]) {errors.push({line:i+1,problem:'Brak poziomu nadrzędnego'});continue;}
    stack[level].children.push(node); stack[level+1]=node; stack.length=level+2;
  }
  return {records:root.children,errors};
}

function convert(input) {
  const parsed = parse(input), records=parsed.records;
  const index=new Map(records.filter(r=>r.id).map(r=>[r.id,r]));
  const issues=parsed.errors.map(x=>({type:x.recovered?'recovered_text_line':'syntax',...x}));
  const seen=new Set();
  for (const r of records) if(r.id) {if(seen.has(r.id)) issues.push({type:'duplicate_record_id',id:r.id});seen.add(r.id);}
  function notes(n) {return all(n,'NOTE').map(x=>ref(x.value)?text(index.get(ref(x.value))):text(x));}
  function citation(n) {return all(n,'SOUR').map(x=>({sourceId:ref(x.value),description:ref(x.value)?'':text(x),page:value(x,'PAGE'),quality:value(x,'QUAY'),text:one(x,'DATA')?value(one(x,'DATA'),'TEXT'):'',notes:notes(x)}));}
  const typeNames={BIRT:'birth',DEAT:'death',BURI:'burial',MARR:'marriage',DIV:'divorce',OCCU:'occupation',RESI:'residence',CENS:'census',EVEN:'event',CHR:'christening',BAPM:'baptism',EMIG:'emigration',IMMI:'immigration',ADOP:'adoption',GRAD:'graduation',RETI:'retirement',NATU:'naturalization'};
  const placeMap=new Map(), events=[];
  function addEvents(n, peopleIds) {
    const counters={};
    for(const c of n.children.filter(c=>typeNames[c.tag])) {
      const date=parseDate(value(c,'DATE')), place=value(c,'PLAC');
      const id=`${n.id}:${c.tag}:${counters[c.tag]=(counters[c.tag]||0)+1}`;
      let placeId=null;
      if(place) {
        placeId='place-'+crypto.createHash('sha256').update(place).digest('hex').slice(0,12);
        if(!placeMap.has(place)) placeMap.set(place,{id:placeId,name:place,lat:null,lon:null,status:'needs_geocoding',eventIds:[]});
        placeMap.get(place).eventIds.push(id);
      }
      events.push({id,type:typeNames[c.tag],gedcomTag:c.tag,ownerId:n.id,people:peopleIds,date,placeId,place,
        detail:value(c,'TYPE')||text(c),notes:notes(c),sources:citation(c)});
      if(date.kind==='unparsed') issues.push({type:'date_to_review',eventId:id,raw:date.raw});
    }
  }
  const people=records.filter(r=>r.tag==='INDI').map(n=>{
    const names=all(n,'NAME').map(x=>{
      const raw=text(x), surname=value(x,'SURN') || (raw.match(/\/([^/]*)\//)||[])[1] || '';
      return {raw,givenName:value(x,'GIVN')||raw.split('/')[0].trim(),surname,nickname:value(x,'NICK'),prefix:value(x,'NPFX'),suffix:value(x,'NSFX')};
    });
    const first=names[0]||{givenName:'',surname:''};
    addEvents(n,[n.id]);
    return {id:n.id,uid:value(n,'_UID'),givenName:first.givenName,surname:first.surname,names,sex:value(n,'SEX'),
      unnamed:!names.some(x=>x.givenName||x.surname),hasDeathRecord:!!one(n,'DEAT'),
      publicationStatus:'not_reviewed',parentFamilyIds:refs(n,'FAMC'),spouseFamilyIds:refs(n,'FAMS'),
      parentLinks:all(n,'FAMC').map(x=>({familyId:ref(x.value),pedigree:value(x,'PEDI'),status:value(x,'STAT')})),notes:notes(n),sources:citation(n)};
  });
  const families=records.filter(r=>r.tag==='FAM').map(n=>{
    const husbandId=refs(n,'HUSB')[0]||null,wifeId=refs(n,'WIFE')[0]||null;
    addEvents(n,[husbandId,wifeId].filter(Boolean));
    return {id:n.id,uid:value(n,'_UID'),husbandId,wifeId,children:refs(n,'CHIL'),notes:notes(n),sources:citation(n)};
  });
  const sources=records.filter(r=>r.tag==='SOUR').map(n=>({id:n.id,title:value(n,'TITL'),author:value(n,'AUTH'),publisher:value(n,'PUBL'),text:value(n,'TEXT'),notes:notes(n)}));
  const personIds=new Set(people.map(p=>p.id)), familyIds=new Set(families.map(f=>f.id));
  const sourceIds=new Set(sources.map(s=>s.id));
  for(const p of people) for(const id of [...p.parentFamilyIds,...p.spouseFamilyIds]) if(!familyIds.has(id)) issues.push({type:'missing_family',personId:p.id,familyId:id});
  for(const f of families) for(const id of [f.husbandId,f.wifeId,...f.children].filter(Boolean)) if(!personIds.has(id)) issues.push({type:'missing_person',familyId:f.id,personId:id});
  for(const owner of [...people,...families,...events]) for(const c of owner.sources) if(c.sourceId&&!sourceIds.has(c.sourceId)) issues.push({type:'missing_source',ownerId:owner.id,sourceId:c.sourceId});
  for(const p of people) {
    for(const id of p.parentFamilyIds) {const f=families.find(f=>f.id===id);if(f&&!f.children.includes(p.id)) issues.push({type:'nonreciprocal_child',personId:p.id,familyId:id});}
    for(const id of p.spouseFamilyIds) {const f=families.find(f=>f.id===id);if(f&&![f.husbandId,f.wifeId].includes(p.id)) issues.push({type:'nonreciprocal_spouse',personId:p.id,familyId:id});}
  }
  for(const f of families) {
    for(const id of f.children) {const p=people.find(p=>p.id===id);if(p&&!p.parentFamilyIds.includes(f.id)) issues.push({type:'nonreciprocal_family_child',personId:id,familyId:f.id});}
    for(const id of [f.husbandId,f.wifeId].filter(Boolean)) {const p=people.find(p=>p.id===id);if(p&&!p.spouseFamilyIds.includes(f.id)) issues.push({type:'nonreciprocal_family_spouse',personId:id,familyId:f.id});}
  }
  // Sprawdzamy jedynie pewną sprzeczność lat, bez traktowania ABT/BEF/AFT jak dat dokładnych.
  for(const p of people) {
    const pe=events.filter(e=>e.ownerId===p.id), b=pe.find(e=>e.type==='birth'&&e.date.kind==='exact'),d=pe.find(e=>e.type==='death'&&e.date.kind==='exact');
    if(b&&d&&b.date.year>d.date.year) issues.push({type:'death_before_birth',personId:p.id,birth:b.date.raw,death:d.date.raw});
  }
  const placeGroups=new Map();
  for(const p of placeMap.values()) {const key=p.name.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[^a-z0-9]/g,'');if(!placeGroups.has(key))placeGroups.set(key,[]);placeGroups.get(key).push(p.name);}
  for(const names of placeGroups.values()) if(names.length>1)issues.push({type:'possible_place_variants',names});
  const places=[...placeMap.values()].sort((a,b)=>b.eventIds.length-a.eventIds.length||a.name.localeCompare(b.name,'pl'));
  const countBy = (items, fn) => items.reduce((a,x)=>(a[fn(x)]=(a[fn(x)]||0)+1,a),{});
  const stats={people:people.length,namedPeople:people.filter(p=>!p.unnamed).length,unnamedPeople:people.filter(p=>p.unnamed).length,
    families:families.length,events:events.length,eventTypes:countBy(events,e=>e.type),places:places.length,
    eventsWithPlace:events.filter(e=>e.place).length,eventsWithDate:events.filter(e=>e.date.raw).length,
    mapCoreEvents:events.filter(e=>['birth','marriage','death'].includes(e.type)).length,
    mapCoreEventsWithPlace:events.filter(e=>['birth','marriage','death'].includes(e.type)&&e.place).length,
    dateKinds:countBy(events,e=>e.date.kind),sources:sources.length,citations:[...people,...families,...events].reduce((s,x)=>s+x.sources.length,0),
    noteEntries:[...people,...families,...events].reduce((s,x)=>s+x.notes.length,0),
    peopleWithDeathRecord:people.filter(p=>p.hasDeathRecord).length,issues:countBy(issues,i=>i.type),
    mediaReferencesIgnored:records.reduce((total,r)=>{function count(n){return (n.tag==='OBJE'?1:0)+n.children.reduce((s,c)=>s+count(c),0);}return total+count(r);},0),
    replacementCharacters:(input.match(/\uFFFD/g)||[]).length};
  return {data:{schemaVersion:1,privateWorkingCopy:true,publicationReady:false,mediaIncluded:false,people,families,events,places,sources},issues,stats};
}

function selfTest(){
  assert.equal(parseDate('ABT 1820').kind,'approximate');
  assert.equal(parseDate('BEF 1900').kind,'before');
  assert.equal(parseDate('BET 1800 AND 1805').end.year,1805);
  assert.equal(parseDate('19 paź 1946').month,10);
  assert.equal(parseDate('1950, 1953 cywilny').year,null);
  assert.equal(parseDate('').year,null);
  assert.equal(parseDate('31 FEB 1900').kind,'unparsed');
  const fixture='0 HEAD\n0 @I1@ INDI\n1 NAME Jan /Żak/\n1 NOTE abc\n2 CONC def\n2 CONT ghi\n1 BIRT\n2 DATE ABT 1820\n2 PLAC Ruda\n1 FAMS @F1@\n0 @I2@ INDI\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 CHIL @I2@\n1 MARR\n2 DATE 1840\n0 TRLR';
  const r=convert(fixture);
  assert.equal(r.data.people[0].notes[0],'abcdef\nghi');
  assert.equal(r.data.people[0].surname,'Żak');
  assert.equal(r.data.people[1].unnamed,true);
  assert.equal(r.data.events.length,2);
  assert.equal(r.data.places[0].lat,null);
  assert.equal(r.issues.length,0);
  const recovered=convert('0 @I1@ INDI\n1 NOTE Pierwszy wiersz\nDalszy tekst bez poziomu\n1 SEX M\n0 TRLR');
  assert.equal(recovered.data.people[0].notes[0],'Pierwszy wiersz\nDalszy tekst bez poziomu');
  assert.equal(recovered.issues[0].type,'recovered_text_line');
  const broken=convert('0 @I1@ INDI\n1 FAMC @F999@\n0 TRLR');
  assert.equal(broken.issues[0].type,'missing_family');
}
function main(){
  selfTest();
  const [source,output]=process.argv.slice(2);
  if(!source||!output)throw Error('Użycie: node importuj-gedcom.cjs plik.ged katalog-wynikowy');
  const bytes=fs.readFileSync(source);
  let input, joinedConcBeforeUtf8=false;
  try { input=new TextDecoder('utf-8',{fatal:true}).decode(bytes); }
  catch {
    // Eksport może rozciąć wielobajtowy polski znak pomiędzy wierszami CONC.
    // Łączymy bajty kontynuacji przed dekodowaniem, bez zastępowania znaków.
    const joined=bytes.toString('latin1').replace(/\r?\n\d+ CONC(?: |(?=\r?$))/gm,'');
    input=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.from(joined,'latin1'));
    joinedConcBeforeUtf8=true;
  }
  const result=convert(input);
  result.stats.joinedConcBeforeUtf8=joinedConcBeforeUtf8;
  fs.mkdirSync(output,{recursive:true});
  const write=(name,obj)=>fs.writeFileSync(path.join(output,name),JSON.stringify(obj,null,2)+'\n','utf8');
  write('genealogia-import-prywatny.json',result.data);
  write('miejscowosci-do-mapowania.json',result.data.places);
  write('kontrola-importu.json',{sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),stats:result.stats,issues:result.issues});
  // Kontrola serializacji i zachowania liczby rekordów po zapisie.
  const saved=JSON.parse(fs.readFileSync(path.join(output,'genealogia-import-prywatny.json'),'utf8'));
  assert.equal(saved.people.length,result.stats.people);assert.equal(saved.events.length,result.stats.events);
  console.log(JSON.stringify({tests:'passed',...result.stats},null,2));
}
if(require.main===module)main();
module.exports={parse,parseDate,convert,selfTest};

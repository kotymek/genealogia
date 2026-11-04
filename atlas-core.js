(function(root){
  'use strict';
  const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/gi,'l').toLowerCase().trim();
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const located=p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;
  const fullName=p=>[p?.givenName,p?.surname].filter(Boolean).join(' ').trim()||'Osoba o nieznanym imieniu';
  function normalize(raw){
    const people=(raw.people||[]).map(p=>({...p,name:fullName(p),search:fold([fullName(p),p.relation,...(p.names||[]).map(n=>n.raw)].join(' '))}));
    const byPerson=new Map(people.map(p=>[p.id,p]));
    const places=new Map((raw.places||[]).map(p=>[p.id,{...p,eventIds:[]} ]));
    const events=(raw.events||[]).map((e,i)=>{
      const date=typeof e.date==='object'&&e.date?e.date:{raw:e.date||String(e.year||''),year:Number(e.year)||null,kind:/około|ok\.|ABT/i.test(e.date||'')?'approximate':'exact'};
      let placeId=e.placeId;
      if(!placeId&&e.place)placeId='legacy:'+e.place+'|'+e.lat+'|'+e.lon;
      if(placeId&&!places.has(placeId))places.set(placeId,{id:placeId,name:e.place,lat:e.lat??null,lon:e.lon??null,eventIds:[]});
      const place=places.get(placeId), names=(e.people||[]).map(id=>byPerson.get(id)?.name||'Osoba niepowiązana w danych');
      const notes=e.notes|| (e.note?[e.note]:[]),sources=e.sources|| (e.source?[{description:e.source}]:[]);
      const result={...e,id:e.id||'event-'+i,date,placeId,place:e.place||place?.name||'',lat:place?.lat??e.lat,lon:place?.lon??e.lon,notes,sources,names,year:date.year??date.start?.year??null};
      result.meaningful=!!(date.raw||result.place||e.detail||notes.length||sources.length);
      result.search=fold([result.place,...names,e.detail,...notes,...(e.people||[]).map(id=>byPerson.get(id)?.search)].join(' '));
      if(place)place.eventIds.push(result.id);
      return result;
    });
    const byEvent=new Map(events.map(e=>[e.id,e])),byPlace=places;
    const personEvents=new Map(people.map(p=>[p.id,[]]));
    events.forEach(e=>(e.people||[]).forEach(id=>personEvents.get(id)?.push(e)));
    personEvents.forEach(es=>es.sort(compareEvents));
    return {people,events,places:[...places.values()],families:raw.families||[],sources:raw.sources||[],byPerson,byEvent,byPlace,personEvents,private:raw.privateWorkingCopy===true};
  }
  function compareEvents(a,b){return (a.year??99999)-(b.year??99999)||a.id.localeCompare(b.id);}
  function dateBounds(d){
    if(d.kind==='unknown'||d.kind==='unparsed')return null;
    if(d.kind==='before'&&d.year)return [-Infinity,d.year];
    if(d.kind==='after'&&d.year)return [d.year,Infinity];
    if(d.start&&d.end)return [d.start.year,d.end.year];
    if(!Number.isFinite(d.year))return null;
    return [d.year,d.year];
  }
  function matches(e,state,data,ignoreTime=false){
    if(!e.meaningful)return false;
    if(state.query&&!state.query.split(/\s+/).every(q=>e.search.includes(fold(q))))return false;
    if(state.person&&!e.people?.includes(state.person))return false;
    if(state.type==='other'&&['birth','marriage','death','burial'].includes(e.type))return false;
    if(state.type&&state.type!=='other'&&e.type!==state.type)return false;
    if(state.line&&!e.people?.some(id=>data.byPerson.get(id)?.line===state.line))return false;
    if(state.located&&!located(e))return false;
    if(!ignoreTime){
      const bounds=dateBounds(e.date);
      if(!bounds){if(!state.unknown)return false;}
      else if((state.from!=null&&bounds[1]<state.from)||(state.to!=null&&bounds[0]>state.to))return false;
      if(state.from!=null&&state.to!=null&&state.from>state.to)return false;
    }
    return true;
  }
  function relatives(personId,data){
    const parents=new Set(),spouses=new Set(),children=new Set(),siblings=new Set();
    for(const f of data.families){
      const pair=[f.husbandId,f.wifeId].filter(Boolean);
      if(f.children?.includes(personId)){pair.forEach(id=>parents.add(id));f.children.filter(id=>id!==personId).forEach(id=>siblings.add(id));}
      if(pair.includes(personId)){pair.filter(id=>id!==personId).forEach(id=>spouses.add(id));(f.children||[]).forEach(id=>children.add(id));}
    }
    // Publiczny zbiór nie ma rodzin: wspólny wpis ślubu potwierdza tylko małżonków.
    if(!data.families.length)(data.personEvents.get(personId)||[]).filter(e=>e.type==='marriage').forEach(e=>e.people.filter(id=>id!==personId).forEach(id=>spouses.add(id)));
    return Object.fromEntries(Object.entries({parents,spouses,children,siblings}).map(([k,v])=>[k,[...v].filter(id=>data.byPerson.has(id))]));
  }
  function lifespan(id,data){
    const es=data.personEvents.get(id)||[];
    const b=es.find(e=>e.type==='birth'),d=es.find(e=>e.type==='death');
    const label=e=>e?.year?(['approximate','estimated','calculated'].includes(e.date.kind)?'ok. ':'')+e.year:'?';
    if(!b?.year&&!d?.year)return d?'Daty życia nieznane':'Daty nieuzupełnione';
    return d?label(b)+' — '+label(d):'ur. '+label(b);
  }
  const api={fold,escape,located,fullName,normalize,compareEvents,dateBounds,matches,relatives,lifespan};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AtlasCore=api;
})(typeof window!=='undefined'?window:globalThis);

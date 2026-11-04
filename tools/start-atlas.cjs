// Prywatny atlas: statyczne pliki wyłącznie na interfejsie loopback.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const allowed=new Set(['index.html','script.js','style.css','atlas-core.js','favicon.svg','data/atlas-data.js','vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css']);
const server=http.createServer((req,res)=>{
  const host='127.0.0.1:'+server.address().port;
  if(req.headers.host!==host||!['GET','HEAD'].includes(req.method)){res.writeHead(403);res.end();return;}
  try{
    const name=decodeURIComponent(new URL(req.url,'http://'+host).pathname).slice(1)||'index.html';
    if(!allowed.has(name)){res.writeHead(404);res.end();return;}
    const body=fs.readFileSync(path.join(root,name));
    res.writeHead(200,{'Content-Type':types[path.extname(name)],'Cache-Control':'no-store','Referrer-Policy':'strict-origin-when-cross-origin','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1',()=>{
  const url='http://127.0.0.1:'+server.address().port+'/';
  console.log('Atlas prywatny: '+url+'\nDane pozostaja lokalnie. Zamknij to okno, aby zatrzymac serwer.');
  if(!process.argv.includes('--no-open')&&process.platform==='win32'){
    const browser=spawn('explorer.exe',[url],{windowsHide:true,stdio:'ignore'});
    browser.on('error',()=>console.log('Otworz powyzszy adres w przegladarce.'));browser.unref();
  }
});
server.on('error',e=>{console.error('Nie mozna uruchomic atlasu:',e.message);process.exitCode=1;});

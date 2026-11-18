/* Service worker : hors connexion. Les fichiers mis en cache restent chiffrés (app.enc). */
const CACHE='maladies-qc-v7';
const FILES=['./','./index.html','./boot.js','./app.enc','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==location.origin)return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{const res=await fetch(req,{cache:'no-cache'});if(res&&res.ok&&res.status===200)cache.put(req,res.clone());return res}   // réseau d'abord (mises à jour)
    catch(err){const hit=await cache.match(req,{ignoreSearch:true})||await cache.match('./index.html');if(hit)return hit;throw err}
  })());
});

const CACHE='cc-app-v1';
const STATIC=[
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=JetBrains+Mono:wght@400;600&display=swap'
];

/* Install — cache static assets */
self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting())
  );
});

/* Activate — remove old caches */
self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

/* Fetch — network first, fallback to cache */
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);

  /* Always network for GitHub API and Supabase */
  if(url.hostname==='api.github.com'||url.hostname.includes('supabase.co')||url.hostname.includes('discord.com')||url.hostname==='api.ipify.org'){
    e.respondWith(fetch(e.request).catch(()=>new Response(JSON.stringify([]),{headers:{'Content-Type':'application/json'}})));
    return;
  }

  /* Cache first for fonts */
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(
      caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
        return res;
      }))
    );
    return;
  }

  /* Network first for everything else, fallback to cache */
  e.respondWith(
    fetch(e.request).then(res=>{
      if(res.ok){
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(e.request,clone));
      }
      return res;
    }).catch(()=>caches.match(e.request).then(cached=>cached||new Response('Offline',{status:503})))
  );
});

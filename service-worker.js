const CACHE="taskearn-v1";
const ASSETS=["/","/index.html","/login.html","/register.html","/dashboard.html","/tasks.html","/wallet.html","/withdraw.html","/history.html","/css/style.css","/manifest.json"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET") return;
 const url=new URL(e.request.url);
 if(url.origin!==location.origin) return;
 e.respondWith(fetch(e.request).then(r=>{
   if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
   return r;
 }).catch(()=>caches.match(e.request)));
});

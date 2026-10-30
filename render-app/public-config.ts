/** Reject privileged keys before a browser bundle can be produced. */
export function isPublishableKey(key:string):boolean{
 if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;
 try{
  const parts=key.split('.');
  if(parts.length!==3)return false;
  const payload=JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
  return payload.role==='anon';
 }catch{return false}
}
export function browserPolicy(supabaseUrl:string):string{
 const url=new URL(supabaseUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('VITE_SUPABASE_URL doit être une origine HTTPS.');
 return [`default-src 'self'`,`script-src 'self'`,`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,`font-src 'self' https://fonts.gstatic.com`,`img-src 'self' data: blob:`,`connect-src 'self' ${url.origin} wss://${url.host}`,`object-src 'none'`,`base-uri 'self'`,`form-action 'self'`].join('; ');
}

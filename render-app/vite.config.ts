import {defineConfig,loadEnv} from 'vite';
import {browserPolicy,isPublishableKey} from './src/lib/public-config.ts';

export default defineConfig(({mode,command})=>{
 const env={...loadEnv(mode,process.cwd(),'VITE_'),...process.env};
 const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(key&&!isPublishableKey(key))throw Error('Clé Supabase privée ou invalide : compilation refusée. Utilisez une clé publiable.');
 if(Boolean(url)!==Boolean(key))throw Error('URL et clé publiable Supabase doivent être renseignées ensemble.');
 const policy=browserPolicy(url||'https://placeholder.supabase.co');
 return {plugins:command==='build'?[{name:'horizon-browser-policy',transformIndexHtml(){return [{tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:policy},injectTo:'head-prepend' as const},{tag:'meta',attrs:{name:'referrer',content:'no-referrer'},injectTo:'head-prepend' as const}]}}]:[]};
});

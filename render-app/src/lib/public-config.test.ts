import {expect,it} from 'vitest';
import {browserPolicy,isPublishableKey} from './public-config';
const jwt=(role:string)=>'header.'+btoa(JSON.stringify({role}))+'.signature';
it('refuse les clés privilégiées et accepte les deux formats publics',()=>{
 expect(isPublishableKey('sb_secret_private')).toBe(false);
 expect(isPublishableKey(jwt('service_role'))).toBe(false);
 expect(isPublishableKey('invalid')).toBe(false);
 expect(isPublishableKey(jwt('anon'))).toBe(true);
 expect(isPublishableKey('sb_publishable_example')).toBe(true);
});
it('borne les connexions au projet et refuse les URL injectables',()=>{
 expect(browserPolicy('https://example.supabase.co')).toContain('connect-src \'self\' https://example.supabase.co wss://example.supabase.co');
 expect(browserPolicy('https://example.supabase.co')).toContain("object-src 'none'");
 expect(()=>browserPolicy('http://example.supabase.co')).toThrow();
 expect(()=>browserPolicy('https://user:password@example.supabase.co')).toThrow();
 expect(()=>browserPolicy('https://example.supabase.co/path')).toThrow();
});

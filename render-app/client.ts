import {createClient} from '@supabase/supabase-js';
import type {Database} from './database.types';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured=Boolean(url&&key);
export const supabase=createClient<Database>(url||'https://placeholder.supabase.co',key||'missing-key');

import {afterEach,expect,it} from 'vitest';
import {appCurrency,currencySymbol,setAppCurrency} from './currency';
afterEach(()=>setAppCurrency('EUR'));
it('garde la devise principale choisie et revient à l’euro si elle est invalide',()=>{
 setAppCurrency('TND');expect(appCurrency()).toBe('TND');expect(currencySymbol()).toBe('DT');
 setAppCurrency('usd');expect(appCurrency()).toBe('EUR');expect(currencySymbol()).toBe('€');
 expect(currencySymbol('USD')).toBe('$');
});

import {test,expect} from 'vitest';
import {parseEuroCents} from './money';

test('convertit exactement les euros et centimes',()=>{
 expect(parseEuroCents('0,29')).toBe(29);
 expect(parseEuroCents('12.3')).toBe(1230);
 expect(parseEuroCents('3000')).toBe(300000);
 expect(parseEuroCents(' 1,05 ')).toBe(105);
 expect(parseEuroCents('0')).toBe(0);
});
test('refuse les formats ambigus et les montants dangereux',()=>{
 for(const input of ['', '-1', '+1', '1e3', '1,234', '1.2.3', 'NaN', '90071992547410']) expect(parseEuroCents(input)).toBeNull();
 expect(parseEuroCents('90071992547409,91')).toBe(Number.MAX_SAFE_INTEGER);
 expect(parseEuroCents('90071992547409,92')).toBeNull();
});

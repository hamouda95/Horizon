import {expect,it} from 'vitest';
import {passwordStrength} from './password-strength';

it('refuse les mots de passe courts ou courants',()=>{
 expect(passwordStrength('abc').score).toBeLessThanOrEqual(1);
 expect(passwordStrength('Motdepasse2026!').score).toBeLessThanOrEqual(1);
 expect(passwordStrength('mohamed-2026-ok','mohamed@example.com').score).toBeLessThanOrEqual(1);
});

it('valorise la longueur et la variété',()=>{
 expect(passwordStrength('tortue-violette-87-nuages').score).toBeGreaterThanOrEqual(3);
 expect(passwordStrength('Kp7!vRq2#mZx9wLs').score).toBe(4);
});

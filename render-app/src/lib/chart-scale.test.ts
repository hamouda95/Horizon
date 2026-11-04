import {expect,it} from 'vitest';import {niceAxisMax} from './chart-scale';
it('arrondit le haut de l’axe à une valeur ronde en euros',()=>{expect(niceAxisMax(1213847)).toBe(2000000);expect(niceAxisMax(240000)).toBe(250000);expect(niceAxisMax(500000)).toBe(500000);expect(niceAxisMax(4210)).toBe(5000);expect(niceAxisMax(0)).toBe(100)});

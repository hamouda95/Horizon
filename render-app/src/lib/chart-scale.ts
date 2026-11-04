/** Top of a chart axis, in cents: the smallest round euro value (1, 2, 2.5 or 5 × 10ⁿ) at or above the largest bar. */
export function niceAxisMax(cents:number):number{
 if(!(cents>0))return 100;
 const euros=cents/100,power=10**Math.floor(Math.log10(euros)),step=[1,2,2.5,5,10].find(s=>s*power>=euros)!;
 return Math.round(step*power*100);
}

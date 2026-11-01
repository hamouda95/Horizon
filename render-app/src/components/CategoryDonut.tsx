import {useState} from 'react';
import {appCurrency} from '../lib/currency';
import {appLocale} from '../lib/locale';
import {displayText} from '../lib/text';

export type DonutSlice={name:string;amount:number};
const palettes={
 expense:['#315e4d','#d5a47f','#80a988','#a7b9ce','#b98479','#dfc589','#8092a8','#b6c49b','#c9b4a2'],
 income:['#2f7a52','#7fb08e','#a7c7a1','#5e8f9b','#c9d9b6','#9fb4c7','#d9c58f','#86a38a','#c2cfc5'],
};
const OTHER='Autres catégories';
const money=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:appCurrency()}).format(cents/100);
// The centre stays short: whole units from 1 000 on.
const short=(cents:number)=>new Intl.NumberFormat(appLocale(),{style:'currency',currency:appCurrency(),maximumFractionDigits:cents>=100000?0:2}).format(cents/100);

/** Largest categories first; beyond the eighth, the rest are gathered in one slice. */
export function donutSlices(items:DonutSlice[],max=8):DonutSlice[]{
 const merged=new Map<string,number>();for(const i of items)if(i.amount>0)merged.set(i.name,(merged.get(i.name)||0)+i.amount);
 const sorted=[...merged].map(([name,amount])=>({name,amount})).sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name));
 if(sorted.length<=max)return sorted;
 const rest=sorted.slice(max-1).reduce((n,s)=>n+s.amount,0);
 return [...sorted.slice(0,max-1),{name:OTHER,amount:rest}];
}

// Point on the circle for an angle measured clockwise from twelve o'clock.
const point=(angle:number,r:number)=>[50+r*Math.sin(angle),50-r*Math.cos(angle)];
function arc(start:number,end:number){
 if(end-start>=Math.PI*2-1e-6)end=start+Math.PI*2-1e-4;
 const [x1,y1]=point(start,42),[x2,y2]=point(end,42),large=end-start>Math.PI?1:0;
 return `M ${x1} ${y1} A 42 42 0 ${large} 1 ${x2} ${y2}`;
}

/** Donut chart of amounts per category, with a legend; selecting a slice can filter the page. */
export default function CategoryDonut({title,overline,items,kind,caption,selected,onSelect,emptyText}:{title:string;overline?:string;items:DonutSlice[];kind:'income'|'expense';caption?:string;selected?:string|null;onSelect?:(name:string|null)=>void;emptyText:string}){
 const slices=donutSlices(items),total=slices.reduce((n,s)=>n+s.amount,0),colors=palettes[kind];
 const [hover,setHover]=useState<string|null>(null);
 const focus=hover??selected??null,focused=slices.find(s=>s.name===focus);
 let angle=0;
 const arcs=slices.map((s,i)=>{const start=angle;angle+=s.amount/total*Math.PI*2;return {...s,color:colors[i%colors.length],d:arc(start,angle)}});
 const pick=(name:string)=>{if(!onSelect||name===OTHER)return;onSelect(selected===name?null:name)};
 return <section className={'card donut-card donut-'+kind}>
  <div className="donut-head"><div>{overline&&<span className="overline">{overline}</span>}<h2>{title}</h2></div>{selected&&onSelect&&<button type="button" className="textbtn" onClick={()=>onSelect(null)}>Tout voir</button>}</div>
  {!total?<p className="chart-empty">{emptyText}</p>:<div className="donut-body">
   <div className="donut-figure">
    <svg viewBox="0 0 100 100" role="img" aria-label={displayText(`${title} : ${money(total)}`)}>
     <circle cx="50" cy="50" r="42" fill="none" stroke="var(--donut-track,#eef2ed)" strokeWidth="13"/>
     {arcs.map(a=><path key={a.name} d={a.d} fill="none" stroke={a.color} strokeWidth={focus===a.name?16:13} strokeLinecap="butt" opacity={focus&&focus!==a.name?.35:1} className={onSelect&&a.name!==OTHER?'donut-slice clickable':'donut-slice'} onMouseEnter={()=>setHover(a.name)} onMouseLeave={()=>setHover(null)} onClick={()=>pick(a.name)}><title>{displayText(`${a.name} : ${money(a.amount)} (${Math.round(a.amount/total*100)} %)`)}</title></path>)}
    </svg>
    <div className="donut-center"><strong>{short(focused?focused.amount:total)}</strong><small>{focused?`${displayText(focused.name)} · ${Math.round(focused.amount/total*100)} %`:'au total'}</small></div>
   </div>
   <ul className="donut-legend">{arcs.map(a=>{const pct=Math.round(a.amount/total*100),content=<><i style={{background:a.color}}/><span>{displayText(a.name)}</span><b>{money(a.amount)}</b><small>{pct} %</small></>;
    return <li key={a.name} onMouseEnter={()=>setHover(a.name)} onMouseLeave={()=>setHover(null)}>{onSelect&&a.name!==OTHER?<button type="button" className={selected===a.name?'selected':''} aria-pressed={selected===a.name} onClick={()=>pick(a.name)}>{content}</button>:<div>{content}</div>}</li>})}</ul>
  </div>}
  {caption&&total>0&&<p className="chart-caption">{caption}</p>}
 </section>;
}

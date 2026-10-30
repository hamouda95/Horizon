import type {Entry} from './household-data';

export type PayEstimate={date:string;daysUntil:number;label:string};
type PayEntry=Pick<Entry,'kind'|'label'|'category'|'amount'|'date'|'personId'|'flowType'>;

const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const payrollTerms=/\b(salaire|paie|payroll|remuneration|traitement)\b/;
const dayMs=86400000;
const dateUtc=(value:string)=>{const [year,month,day]=value.split('-').map(Number);return Date.UTC(year,month-1,day)};
const isoDate=(value:number)=>new Date(value).toISOString().slice(0,10);
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};

export function estimateNextPayday(entries:PayEntry[],today:string):PayEstimate|null{
 const groups=new Map<string,PayEntry[]>();
 for(const entry of entries){
  if(entry.kind!=='income'||(entry.flowType||'standard')!=='standard'||entry.amount<=0||entry.date>today)continue;
  const label=normalize(entry.label),category=normalize(entry.category);
  if(!payrollTerms.test(label)&&!payrollTerms.test(category))continue;
  const key=[entry.personId||'shared',category,label].join('|');
  groups.set(key,[...(groups.get(key)||[]),entry]);
 }
 const estimates:PayEstimate[]=[];
 for(const rows of groups.values()){
  const sorted=rows.sort((a,b)=>a.date.localeCompare(b.date));
  const recent=sorted.slice(-4);
  if(recent.length<2)continue;
  const latest=recent[recent.length-1];
  const latestAge=(dateUtc(today)-dateUtc(latest.date))/dayMs;
  if(latestAge<0||latestAge>45)continue;
  const intervals=recent.slice(1).map((row,index)=>(dateUtc(row.date)-dateUtc(recent[index].date))/dayMs);
  const cadence=median(intervals);
  if(!intervals.every(gap=>gap>=5&&gap<=35))continue;
  const recognizedCadence=intervals.every(gap=>gap>=5&&gap<=9)||intervals.every(gap=>gap>=12&&gap<=18)||intervals.every(gap=>gap>=25&&gap<=35);
  if(!recognizedCadence)continue;
  const monthly=intervals.every(gap=>gap>=25&&gap<=35);
  const lastDate=new Date(dateUtc(latest.date));
  const targetDay=median(recent.map(row=>Number(row.date.slice(8,10))));
  const atMonth=(offset:number)=>{const end=new Date(Date.UTC(lastDate.getUTCFullYear(),lastDate.getUTCMonth()+offset+1,0));return Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),Math.min(targetDay,end.getUTCDate()))};
  let offset=1;
  let next=monthly?atMonth(offset):dateUtc(latest.date)+cadence*dayMs;
  while(next<=dateUtc(today))next=monthly?atMonth(++offset):next+cadence*dayMs;
  estimates.push({date:isoDate(next),daysUntil:Math.ceil((next-dateUtc(today))/dayMs),label:latest.label});
 }
 return estimates.sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
}

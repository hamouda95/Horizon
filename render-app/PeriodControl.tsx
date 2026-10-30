import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {Dispatch,SetStateAction} from 'react';
import {shiftMonth} from './period';

export default function PeriodControl({month,setMonth}:{month:string;setMonth:Dispatch<SetStateAction<string>>}){
 return <div className="period-controls"><button type="button" aria-label="Mois précédent" title="Mois précédent" onClick={()=>setMonth(m=>shiftMonth(m,-1))}><ChevronLeft size={18}/></button><label className="month"><span>Période</span><input aria-label="Période" type="month" value={month} onChange={e=>{if(e.target.value)setMonth(e.target.value)}}/></label><button type="button" aria-label="Mois suivant" title="Mois suivant" onClick={()=>setMonth(m=>shiftMonth(m,1))}><ChevronRight size={18}/></button></div>;
}

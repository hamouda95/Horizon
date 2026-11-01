import type {ReactNode} from 'react';
import {Info} from 'lucide-react';

/** Method notes and fine print, folded behind a small "i" so screens stay light. */
export default function InfoTip({children,label='Détails'}:{children:ReactNode;label?:string}){
 return <details className="info-tip"><summary><Info size={13} aria-hidden="true"/><span>{label}</span></summary><div className="info-tip-body">{children}</div></details>;
}

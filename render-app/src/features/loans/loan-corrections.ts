// Plain-French messages for the database rules that protect loans, and the repayment deadline status.
export function loanErrorMessage(error:{message?:string;code?:string}|null|undefined):string{
 const message=error?.message||'';
 if(/Repayments cannot exceed/i.test(message))return 'Impossible : les remboursements déjà enregistrés dépasseraient le montant prêté.';
 if(/must precede its first operation/i.test(message))return 'La date du prêt doit précéder sa première opération.';
 if(/expected_after_opening/i.test(message))return 'La date de remboursement prévue doit suivre la date du prêt.';
 if(/dated before the operation/i.test(message))return 'Cette opération est antérieure à la date du prêt : avancez d’abord la date du prêt dans « Modifier ».';
 if(/loan payment method/i.test(message))return 'Choisissez le moyen de paiement de cette opération.';
 if(/cash payment requires a cash account/i.test(message))return 'Un paiement en espèces doit être rattaché à un compte Espèces : choisissez un autre moyen de paiement.';
 if(/has linked operations/i.test(message))return 'Ce prêt a des opérations liées : confirmez leur suppression avec le prêt.';
 if(/immutable|delete_household_loan|expected_repayment_on/i.test(message)||error?.code==='42703'||error?.code==='PGRST202')return 'Cette correction demande une mise à jour de la base de données qui n’est pas encore installée.';
 return message||'Modification impossible pour le moment.';
}

export type RepaymentStatus={label:string;late:boolean}|null;
export function repaymentStatus(expected:string|null|undefined,outstandingCents:number,today:string):RepaymentStatus{
 if(!expected||outstandingCents<=0)return null;
 const day=new Date(expected+'T12:00:00').toLocaleDateString('fr-FR');
 return expected<today?{label:`Remboursement prévu le ${day} · en retard`,late:true}:{label:`Remboursement prévu le ${day}`,late:false};
}

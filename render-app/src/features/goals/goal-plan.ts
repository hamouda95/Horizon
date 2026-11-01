// Monthly contribution needed to reach a savings goal by its target date.
export function monthsUntil(targetDate:string,today:string){
 const [ty,tm]=targetDate.split('-').map(Number),[cy,cm]=today.split('-').map(Number);
 return (ty-cy)*12+(tm-cm);
}

export function monthlyContribution(targetCents:number,savedCents:number,targetDate:string|null,today:string):{months:number;cents:number}|null{
 const remaining=targetCents-savedCents;
 if(!targetDate||remaining<=0)return null;
 // The target month counts: a goal due next month leaves this month and next month to save.
 const months=Math.max(1,monthsUntil(targetDate,today)+1);
 return {months,cents:Math.ceil(remaining/months/100)*100};
}

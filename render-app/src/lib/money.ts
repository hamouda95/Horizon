/**
 * Convertit un montant saisi en euros en centimes entiers.
 * Deux décimales maximum ; refuse les signes, exposants et valeurs hors plage sûre.
 */
export function parseEuroCents(input:string):number|null {
 const match=/^(\d+)(?:[.,](\d{0,2}))?$/.exec(input.trim());
 if(!match)return null;
 const euros=BigInt(match[1]);
 const cents=euros*100n+BigInt((match[2]||'').padEnd(2,'0')||'0');
 return cents<=BigInt(Number.MAX_SAFE_INTEGER)?Number(cents):null;
}

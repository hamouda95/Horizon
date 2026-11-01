// Local estimate of a password's strength, shown while the user types: nothing leaves the browser.
const common=['password','motdepasse','azerty','qwerty','123456','soleil','bonjour','horizon','budget','admin','welcome','iloveyou','tunis'];
export type Strength={score:0|1|2|3|4;label:string;hint:string};
const labels=['Très faible','Faible','Moyen','Bon','Excellent'];

export function passwordStrength(password:string,email=''):Strength{
 if(!password)return {score:0,label:labels[0],hint:'12 caractères minimum.'};
 const lower=password.toLowerCase(),name=email.split('@')[0].toLowerCase();
 const kinds=[/[a-z]/,/[A-Z]/,/\d/,/[^A-Za-z0-9]/].filter(r=>r.test(password)).length;
 let points=password.length>=20?3:password.length>=16?2:password.length>=12?1:0;
 points+=kinds>=3?1:0;
 if(new Set(password).size>=10)points+=1;
 const weak=common.some(w=>lower.includes(w))||(name.length>=4&&lower.includes(name))||/(.)\1{3,}|0123|1234|abcd/i.test(password);
 if(weak)points=Math.min(points,1);
 if(password.length<12)points=Math.min(points,1);
 const score=Math.max(0,Math.min(4,points)) as Strength['score'];
 const hint=password.length<12?'12 caractères minimum.':weak?'Évitez les mots courants, les suites et votre adresse e-mail.':score<3?'Allongez-le : une phrase de quelques mots est facile à retenir.':'Mot de passe solide.';
 return {score,label:labels[score],hint};
}

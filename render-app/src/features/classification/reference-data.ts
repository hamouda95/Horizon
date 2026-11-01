import type {FlowType} from '../../lib/flow';

// French household reference dictionary: merchants, organisations and keywords seen on bank statements.
// Terms are lower-case without accents and match whole words (or glued multi-word brands, e.g. "ubereats").
// A household's confirmed rules always win over this dictionary; the more precise (longer) term wins inside it.
export type ReferenceRule={key:string;terms:string[];kind:'income'|'expense';category:string;subcategory:string;flowType?:FlowType};

/** Household categories to fall back on when a reference category does not exist yet in the household. */
export const categoryAliases:Record<string,string[]>={
 'Shopping':['Achats','Autres dépenses','Divers'],
 'Enfants':['Famille','Autres dépenses'],
 'Banque et frais':['Banque','Frais bancaires','Factures','Autres dépenses'],
 'Animaux':['Autres dépenses'],
 'Voyages':['Voyage','Vacances','Loisirs'],
 'Épargne':['Epargne','Autres dépenses','Autres revenus'],
 'Placements':['Épargne','Epargne','Autres dépenses','Autres revenus'],
 'Retraits d’espèces':['Espèces','Autres dépenses'],
 'Dons et cadeaux':['Cadeaux','Autres dépenses'],
 'Retraite':['Pensions','Salaire','Autres revenus'],
 'Ventes':['Autres revenus'],
 'Aides':['Allocations','Autres revenus'],
 'Revenus locatifs':['Loyers','Autres revenus'],
 'Remboursements':['Autres revenus'],
 'Revenus de placements':['Autres revenus'],
 'Salaire':['Salaires','Revenus'],
};

export const referenceData:ReferenceRule[]=[
 // ——— Courses
 {key:'groceries',terms:['franprix','carrefour','carrefour market','carrefour city','carrefour express','auchan','lidl','aldi','intermarche','leclerc','e leclerc','monoprix','monop','super u','hyper u','u express','casino','geant casino','picard','supermarche','hyper market','hypermarche','epicerie','netto','leader price','grand frais','biocoop','naturalia','la vie claire','g20','spar','vival','proxi','coccinelle','cora','supeco','colruyt','thiriet','la grande epicerie','marche frais','rapid market','super market','mini market','superette','drive leclerc','chronodrive','houra','la belle vie','toupargel','marks spencer','day by day','bio c bon','satoriz','metro cash'],kind:'expense',category:'Courses',subcategory:'Supermarchés et alimentation'},
 {key:'bakery',terms:['boulangerie','patisserie','brioche doree','marie blachere','ange boulangerie','fournil','la mie caline','boulangerie patisserie','viennoiserie'],kind:'expense',category:'Courses',subcategory:'Boulangerie'},
 {key:'butcher',terms:['boucherie','boucher','charcuterie','traiteur','volailler','poissonnerie','fromagerie','cremerie'],kind:'expense',category:'Courses',subcategory:'Boucherie'},
 {key:'market',terms:['primeur','primeurs','marche','fruits legumes','maraicher'],kind:'expense',category:'Courses',subcategory:'Marché et primeurs'},
 // ——— Restaurants et sorties
 {key:'restaurant',terms:['restaurant','resto','uber eats','ubereats','deliveroo','just eat','justeat','mcdonald','mcdonalds','mc donald','burger king','kfc','quick','five guys','subway','dominos','domino s pizza','pizza hut','pizza','pizzeria','sushi','kebab','tacos','o tacos','brasserie','bistrot','creperie','buffalo grill','hippopotamus','courtepaille','flunch','la boucherie','leon de bruxelles','del arte','big mama','pokawa','bagelstein','starbucks','columbus cafe','pret a manger','exki','cojean','paul restaurant','les burgers de papa','wok','grill','traiteur asiatique','snack','food','cantine','self','restauration'],kind:'expense',category:'Loisirs',subcategory:'Restaurants et livraison'},
 {key:'bar',terms:['bar','cafe','pub','brasserie bar','tabac bar','salon de the','coffee','cafeteria','bar tabac'],kind:'expense',category:'Loisirs',subcategory:'Cafés et bars'},
 {key:'culture',terms:['cinema','ugc','pathe','gaumont','mk2','cgr','kinepolis','fnac spectacles','ticketmaster','see tickets','digitick','theatre','musee','concert','spectacle','opera','zoo','parc asterix','disneyland','futuroscope','bowling','escape game','laser game','karting','billetreduc'],kind:'expense',category:'Loisirs',subcategory:'Sorties et culture'},
 {key:'sport',terms:['basic fit','basicfit','fitness park','keep cool','l orange bleue','neoness','on air fitness','club med gym','salle de sport','urbansoccer','urban soccer','le five','piscine','golf','tennis','escalade','yoga','crossfit','gymlib','decathlon pass'],kind:'expense',category:'Loisirs',subcategory:'Sport et fitness'},
 {key:'subscription',terms:['netflix','spotify','disney','disney plus','deezer','canal plus','prime video','amazon prime','youtube premium','apple music','apple com bill','itunes','google play','google storage','icloud','dazn','bein','molotov','salto','paramount','crunchyroll','audible','kindle unlimited','tidal','qobuz','ocs','mycanal'],kind:'expense',category:'Loisirs',subcategory:'Abonnements'},
 {key:'games',terms:['playstation','playstation network','psn','xbox','microsoft store','nintendo','steam','epic games','twitch','riot games','blizzard','ubisoft','micromania'],kind:'expense',category:'Loisirs',subcategory:'Jeux vidéo'},
 {key:'press',terms:['presse','journal','le monde','le figaro','liberation','mediapart','cafeyn','relay','maison de la presse','librairie','fnac livre','cultura','gibert'],kind:'expense',category:'Loisirs',subcategory:'Presse et livres'},
 // ——— Voyages
 {key:'travel',terms:['booking','booking com','airbnb','expedia','hotels com','hotel','ibis','novotel','mercure','campanile','kyriad','b b hotel','premiere classe','accor','abritel','gites de france','pierre et vacances','center parcs','club med','odalys','belambra','camping','govoyages','opodo','lastminute','edreams','voyage prive','tui','fram','look voyages'],kind:'expense',category:'Voyages',subcategory:'Hébergement et séjours'},
 {key:'flights',terms:['air france','airfrance','easyjet','ryanair','transavia','vueling','volotea','lufthansa','klm','british airways','iberia','tap portugal','emirates','turkish airlines','royal air maroc','tunisair','air algerie','corsair','aeroport','airport'],kind:'expense',category:'Transport',subcategory:'Transports longue distance (avions, trains…)'},
 // ——— Transport
 {key:'trains',terms:['sncf','sncf connect','oui sncf','ouigo','tgv','ter','intercites','trainline','eurostar','thalys','lyria','flixbus','blablacar','blablacar bus','omio'],kind:'expense',category:'Transport',subcategory:'Transports longue distance (avions, trains…)'},
 {key:'public-transport',terms:['ratp','navigo','ile de france mobilites','idf mobilites','transilien','tcl','rtm','tisseo','tbm','star rennes','tan nantes','ilevia','fil bleu','keolis','transdev','metro','tramway','bus','service navigo','mobilis','fulli','tib bus'],kind:'expense',category:'Transport',subcategory:'Transports quotidiens (métro, bus…)'},
 {key:'taxi',terms:['uber','uber trip','bolt','heetch','marcel','g7','taxi','free now','freenow','lyft','cabify','le cab'],kind:'expense',category:'Transport',subcategory:'Taxis'},
 {key:'fuel',terms:['carburant','essence','gazole','station service','totalenergies','total energies','total access','relais total','esso','shell','avia','agip','dyneff','certas','bp station','intermarche carburant','leclerc station','carrefour station','auchan carburant','station u','petrolec','plenergy'],kind:'expense',category:'Transport',subcategory:'Carburant'},
 {key:'parking',terms:['parking','indigo','saemes','effia','onepark','zenpark','easypark','paybyphone','pay by phone','flowbird','stationnement','stattelpaybyphon','opngo','q park','interparking'],kind:'expense',category:'Transport',subcategory:'Parking'},
 {key:'tolls',terms:['peage','peages','aprr','sanef','vinci autoroutes','cofiroute','asf','escota','bip go','ulys','autoroute','autoroutes','atmb','sapn','alis'],kind:'expense',category:'Transport',subcategory:'Péages'},
 {key:'car-care',terms:['norauto','feu vert','speedy','midas','point s','euromaster','controle technique','dekra','autosur','securitest','garage','carrosserie','lavage auto','speed wash','station lavage','pneus','vidange'],kind:'expense',category:'Transport',subcategory:'Réparation'},
 {key:'car-rental',terms:['hertz','europcar','sixt','enterprise rent','rent a car','ada location','getaround','leasys','free2move','zity','share now','ucar','virtuo','hertz dollar'],kind:'expense',category:'Transport',subcategory:'Location de véhicules'},
 {key:'micromobility',terms:['lime','dott','tier','velib','velo v','cityscoot','yego','voi'],kind:'expense',category:'Transport',subcategory:'Transports quotidiens (métro, bus…)'},
 // ——— Logement
 {key:'rent-out',terms:['loyer','loyers','quittance','bail habitation','location immobiliere','foncia','nexity','citya','oralia','sergic','orpi','century 21','laforet','guy hoquet','opac','hlm','paris habitat','3f','icf habitat','cdc habitat','action logement','agence immobiliere','gestion locative'],kind:'expense',category:'Logement',subcategory:'Loyer',flowType:'standard'},
 {key:'housing-charges',terms:['syndic','charges copropriete','copropriete','charges locatives','gardien','entretien immeuble'],kind:'expense',category:'Logement',subcategory:'Charges'},
 {key:'diy',terms:['leroy merlin','castorama','brico depot','bricomarche','mr bricolage','weldom','bricorama','point p','cedeo','lapeyre','gedimat','tollens','zolpan','travaux','artisan','plombier','electricien','serrurier'],kind:'expense',category:'Logement',subcategory:'Travaux, réparation, entretien, aménagement…'},
 {key:'furniture',terms:['ikea','conforama','but','maisons du monde','alinea','la redoute interieurs','gifi','la foir fouille','centrakor','hema','zara home','h m home','habitat','roche bobois','boulanger electromenager','darty','but cosy','cuisinella','schmidt','mobalpa'],kind:'expense',category:'Logement',subcategory:'Mobilier, électroménager, décoration…'},
 // ——— Factures
 {key:'energy',terms:['edf','engie','totalenergies electricite','total direct energie','direct energie','eni','ekwateur','mint energie','planete oui','ilek','vattenfall','ohm energie','gaz de bordeaux','electricite','gaz naturel','grdf','enedis','butagaz','primagaz','antargaz','fioul'],kind:'expense',category:'Factures',subcategory:'Énergie'},
 {key:'water',terms:['veolia','suez','eau de paris','saur','eau du grand lyon','sedif','facture eau','service des eaux','compagnie des eaux'],kind:'expense',category:'Factures',subcategory:'Eau'},
 {key:'telecom',terms:['free mobile','free telecom','freebox','orange','bouygues telecom','bouygues app','bbox','sfr','sosh','red by sfr','b you','nrj mobile','la poste mobile','prixtel','coriolis','lebara','lycamobile','syma','youprice','cdiscount mobile','auchan telecom','reglo mobile'],kind:'expense',category:'Factures',subcategory:'Téléphonie et internet'},
 {key:'insurance',terms:['assurance','assurances','axa','maif','macif','matmut','allianz','mma','gmf','groupama','generali','aviva','abeille assurances','maaf','direct assurance','olivier assurance','leocare','luko','lovys','avanssur','pacifica','sogessur','swisslife','swiss life','april','hiscox','amv','assurance habitation','assurance auto','prevoyance','cardif','predica','suravenir'],kind:'expense',category:'Factures',subcategory:'Assurances'},
 {key:'software',terms:['microsoft','office 365','microsoft 365','adobe','dropbox','google workspace','google one','openai','chatgpt','claude ai','anthropic','notion','canva','nordvpn','surfshark','ovh','ionos','godaddy','o2switch'],kind:'expense',category:'Factures',subcategory:'Abonnements & téléphonie - Autres'},
 // ——— Santé
 {key:'health',terms:['pharmacie','pharmacy','parapharmacie','medecin','docteur','dr','dentiste','orthodontiste','kine','kinesitherapeute','osteopathe','psychologue','sage femme','infirmier','medical','hopital','clinique','laboratoire','laboratoire analyses','biogroup','cerballiance','synlab','eurofins biomnis','radiologie','imagerie','doctolib','urgences','centre de sante','pharma'],kind:'expense',category:'Santé',subcategory:'Soins et pharmacie'},
 {key:'optics',terms:['optique','opticien','afflelou','optic 2000','krys','atol','grandoptical','general d optique','lissac','audition','amplifon','audika'],kind:'expense',category:'Santé',subcategory:'Optique, audition…'},
 {key:'mutual',terms:['mutuelle','harmonie mutuelle','mgen','malakoff humanis','ag2r','alan','apivia','ociane','mutuelle generale','pro btp','klesia','humanis','solimut','mnt','smeno','heyme','lmde'],kind:'expense',category:'Santé',subcategory:'Mutuelle'},
 // ——— Impôts et taxes
 {key:'tax',terms:['dgfip','finances publiques','impot','impots','impots gouv','tresor public','taxe fonciere','taxe habitation','prelevement a la source','pas impot','sip','direction generale des finances','contribution audiovisuelle'],kind:'expense',category:'Impôts et taxes',subcategory:'Impôts'},
 {key:'fines',terms:['antai','amende','amendes','pv','contravention','fourriere'],kind:'expense',category:'Impôts et taxes',subcategory:'Amendes'},
 // ——— Shopping
 {key:'online',terms:['amazon','amazon payments','amzn','amzn mktp','amazon mktplace','cdiscount','fnac','fnac com','darty com','rakuten','ebay','aliexpress','temu','shein','wish','veepee','showroomprive','la redoute','manomano','vinted achat','leboncoin achat','zalando','asos','etsy','wish com','back market','backmarket'],kind:'expense',category:'Shopping',subcategory:'Achats en ligne'},
 {key:'clothes',terms:['zara','h m','hm','primark','kiabi','uniqlo','celio','bershka','pull bear','stradivarius','mango','promod','camaieu','pimkie','jennyfer','gemo','la halle','tati','galeries lafayette','printemps','bhv','courir','foot locker','jd sports','nike','adidas','puma','go sport','intersport','decathlon','sport 2000','chausseur','eram','minelli','san marina','vertbaudet','okaidi','tape a l oeil','sergent major','du pareil au meme','kaporal','levis','lacoste','sephora','nocibe','marionnaud','yves rocher','kiko','lush','l occitane','rituals','douglas'],kind:'expense',category:'Shopping',subcategory:'Vêtements et accessoires'},
 {key:'electronics',terms:['apple store','apple','samsung','darty','boulanger com','ldlc','materiel net','grosbill','rue du commerce','top achat','orange boutique','sfr boutique','fnac darty','cdiscount electro','electro depot','but electromenager','dyson'],kind:'expense',category:'Shopping',subcategory:'Electronique et informatique'},
 {key:'discount-stores',terms:['action','stokomani','noz','b m','foir fouille','tedi','max bazar','dealz','normal','hema','flying tiger','gifi'],kind:'expense',category:'Shopping',subcategory:'Bazar et discount'},
 {key:'tobacco',terms:['tabac','buraliste','civette','fdj','francaise des jeux','pmu','loto'],kind:'expense',category:'Loisirs',subcategory:'Tabac'},
 // ——— Enfants, animaux, dons
 {key:'children',terms:['creche','nounou','assistante maternelle','garderie','cantine scolaire','periscolaire','centre de loisirs','ecole','college','lycee','fournitures scolaires','pajemploi','yoopala','babychou','kinougarde','toys r us','king jouet','la grande recre','joueclub','oxybul','aubert','orchestra','natalys','bebe 9','cyrillus'],kind:'expense',category:'Enfants',subcategory:'Garde, école et activités'},
 {key:'pets',terms:['veterinaire','clinique veterinaire','animalerie','maxi zoo','tom co','truffaut','jardiland','zooplus','wanimo','croquettes'],kind:'expense',category:'Animaux',subcategory:'Soins et nourriture'},
 {key:'donations',terms:['dons','croix rouge','restos du coeur','secours populaire','unicef','medecins sans frontieres','msf','amnesty','wwf','fondation','association','helloasso','leetchi','cagnotte','lydia cagnotte'],kind:'expense',category:'Dons et cadeaux',subcategory:'Dons et cagnottes'},
 // ——— Banque
 {key:'bank-fees',terms:['frais','frais cb','frais bancaires','cotisation carte','cotisation','commission','commissions','agios','interets debiteurs','frais de tenue','tenue de compte','frais cb visa','visa ultim','visa premier','gold mastercard','frais rejet','commission intervention','frais retrait','frais paiement etranger'],kind:'expense',category:'Banque et frais',subcategory:'Frais bancaires et de gestion (dont agios)'},
 {key:'loan-payment',terms:['echeance pret','remboursement pret','pret immobilier','credit immobilier','credit auto','credit consommation','cofidis','cetelem','sofinco','franfinance','younited','floa','oney','credit agricole consumer','carrefour banque','echeance credit'],kind:'expense',category:'Banque et frais',subcategory:'Remboursements de crédit'},
 // ——— Mouvements (nature décidée par le dictionnaire)
 {key:'cash-withdrawal',terms:['retrait dab','retrait distributeur','retrait especes','retrait gab','retrait','dab','withdrawal','atm'],kind:'expense',category:'Retraits d’espèces',subcategory:'Retraits au distributeur',flowType:'transfer'},
 {key:'savings-out',terms:['livret a','ldds','lep','livret developpement durable','livret epargne populaire','pel','cel','livret jeune','livret bleu','versement epargne','virement epargne'],kind:'expense',category:'Épargne',subcategory:'Versements sur livrets',flowType:'savings'},
 {key:'savings-in',terms:['livret a','ldds','lep','pel','cel','retrait epargne','depuis livret','depuis epargne'],kind:'income',category:'Épargne',subcategory:'Retraits de livrets',flowType:'savings'},
 {key:'investment-out',terms:['assurance vie','pea','compte titres','bourse','courtage','boursorama bourse','trade republic','degiro','scalable','yomoni','nalo','linxea','placement','scpi','crypto','coinbase','binance','kraken','bitpanda'],kind:'expense',category:'Placements',subcategory:'Versements sur placements',flowType:'investment'},
 // ——— Revenus
 {key:'rent-in',terms:['loyer','loyers','revenu locatif','revenus locatifs','location immobiliere','locataire'],kind:'income',category:'Revenus locatifs',subcategory:'Loyers',flowType:'standard'},
 {key:'salary',terms:['salaire','salaires','paie','payroll','remuneration','traitement','solde salaire','acompte salaire','prime','primes','interessement','participation','13eme mois','net a payer'],kind:'income',category:'Salaire',subcategory:'Salaire net',flowType:'standard'},
 {key:'benefits',terms:['caf','allocations familiales','allocation logement','apl','als','alf','prime activite','rsa','paje','ars','allocation rentree','france travail','pole emploi','msa','aah','cheque energie','bourse'],kind:'income',category:'Aides',subcategory:'Prestations et allocations',flowType:'standard'},
 {key:'pension',terms:['retraite','pension','cnav','assurance retraite','agirc arrco','agirc','arrco','carsat','ircantec','cnracl','retraite complementaire','pension invalidite'],kind:'income',category:'Retraite',subcategory:'Pensions de retraite',flowType:'standard'},
 {key:'refund',terms:['remboursement','rembt','cpam','ameli','securite sociale','avoir','mutuelle remboursement','indemnite','indemnites journalieres','remboursement impot','restitution','annulation','refund','retour article'],kind:'income',category:'Remboursements',subcategory:'Remboursements reçus',flowType:'refund'},
 {key:'interest',terms:['interets credites','interets livret','interets','dividendes','dividende','coupon','plus value'],kind:'income',category:'Revenus de placements',subcategory:'Intérêts et dividendes',flowType:'standard'},
 {key:'sales',terms:['vinted','leboncoin','ebay vente','backmarket reprise','rakuten vente','vestiaire collective','selency','vente'],kind:'income',category:'Ventes',subcategory:'Ventes d’occasion',flowType:'standard'},
];

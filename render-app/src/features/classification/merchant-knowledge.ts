import type {FlowType} from '../../lib/flow';

export type MerchantKnowledgeRule = {
  merchant_key: string;
  merchant_label: string;
  kind: 'income' | 'expense';
  category_id: string;
  subcategory_id: string | null;
  sample_count: number;
  flow_type?: FlowType | null;
};

const ignored = new Set([
  'achat', 'carte', 'cb', 'debit', 'paiement', 'payment', 'visa', 'mastercard',
  'operation', 'transaction', 'contactless', 'sans', 'contact', 'euros', 'eur',
  'vir', 'virs', 'virement', 'virements', 'sepa', 'inst', 'instantane', 'prlv', 'prelevement', 'prelevements', 'recu', 'recus', 'emis', 'vers', 'de', 'du', 'compte', 'comptes',
]);

export function normalizeMerchant(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter(token => token && !ignored.has(token) && !/^\d+$/.test(token)).join(' ');
}

function exactTokenPhrase(label: string, phrase: string): boolean {
  return (` ${normalizeMerchant(label)} `).includes(` ${phrase} `);
}

/** Use an explicit household-confirmed brand rule when the bank label contains it. */
export function matchMerchantRule(
  label: string,
  kind: 'income' | 'expense',
  rules: MerchantKnowledgeRule[],
): MerchantKnowledgeRule | null {
  const matches = rules.filter(rule => rule.kind === kind && rule.category_id &&
    exactTokenPhrase(label, rule.merchant_key));
  if (!matches.length) return null;
  const longest = Math.max(...matches.map(rule => rule.merchant_key.length));
  const best = matches.filter(rule => rule.merchant_key.length === longest);
  if (new Set(best.map(rule => `${rule.category_id}:${rule.subcategory_id || ''}`)).size > 1) return null;
  return best[0];
}

/** Learn from a card transaction only after the user changed its suggested category. */
export function cardMerchantKey(label: string): string | null {
  const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();
  if (!/(^| )(carte|cb|card|visa|mastercard)( |$)/.test(normalized)) return null;
  const merchantTokens = normalized.split(' ').filter(token => !/^\d+$/.test(token) && !ignored.has(token));
  if (!merchantTokens.length) return null;
  return merchantTokens.slice(0, Math.min(3, merchantTokens.length)).join(' ');
}

/** Stable key for learning a bank counterparty beyond card-only labels. */
export function transactionMerchantKey(label:string):string|null{
 const key=normalizeMerchant(label).split(' ').filter(token=>token&&!/^\d+$/.test(token)).slice(0,3).join(' ');
 return key.length>=4?key:null;
}

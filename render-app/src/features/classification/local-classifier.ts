import {cardMerchantKey,matchMerchantRule} from './merchant-knowledge';
import type {MerchantKnowledgeRule} from './merchant-knowledge';

export type ClassificationKind = 'income' | 'expense';

export type ClassificationExample = {
  label: string;
  kind: ClassificationKind;
  categoryId: string;
  subcategoryId?: string | null;
  flowType?: string;
};

export type ClassificationOption = {
  id: string;
  kind: string;
  active: boolean;
  name?: string;
};

export type LocalClassification = {
  categoryId: string;
  subcategoryId: string | null;
  confidence: 'high' | 'medium';
};

export type HouseholdClassifier = ((label: string, kind: ClassificationKind) => LocalClassification | null) & {
  isAmbiguous?: (label: string, kind: ClassificationKind) => boolean;
};

const ignoredWords = new Set([
  'avec', 'dans', 'pour', 'chez', 'sur', 'par', 'les', 'des', 'une', 'aux', 'and',
  'the', 'carte', 'paiement', 'achat', 'operation', 'virement', 'prelevement',
  'sepa', 'cb', 'cartebancaire', 'retrait', 'commission', 'transaction', 'eur',
  'euros', 'debit', 'credit', 'du', 'dun', 'au', 'a', 'le', 'la', 'en', 'from',
]);

function tokens(value: string): string[] {
  return [...new Set(value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter(token => token.length >= 3 && !/^\d+$/.test(token) && !ignoredWords.has(token)))];
}

/** Build an in-memory nearest-neighbour model from this household's already classified operations. */
export function createHouseholdClassifier(
  categories: ClassificationOption[],
  examples: ClassificationExample[],
  merchantRules: MerchantKnowledgeRule[] = [],
): HouseholdClassifier {
  const activeIds = new Set(categories.filter(category => category.active).map(category => category.id));
  const corpus: Record<ClassificationKind, Array<ClassificationExample & { words: string[] }>> = { income: [], expense: [] };
  const documentFrequency: Record<ClassificationKind, Map<string, number>> = { income: new Map(), expense: new Map() };
  const merchantCategories = new Map<string, Set<string>>();

  for (const example of examples) {
    if (!activeIds.has(example.categoryId)||example.flowType&&example.flowType!=='standard') continue;
    const category=categories.find(c=>c.id===example.categoryId);
    if(category?.name&&/^(autres?|other|non class|non categor)/i.test(category.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))continue;
    const merchantKey = cardMerchantKey(example.label);
    if (merchantKey) {
      const key = `${example.kind}:${merchantKey.replace(/\s+/g, '')}`;
      const known = merchantCategories.get(key) || new Set<string>();
      known.add(example.categoryId);
      merchantCategories.set(key, known);
    }
    const words = tokens(example.label);
    if (!words.length) continue;
    corpus[example.kind].push({ ...example, words });
    for (const word of words) {
      const frequencies = documentFrequency[example.kind];
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    }
  }

  const ambiguousMerchants = new Set([...merchantCategories.entries()]
    .filter(([, categoryIds]) => categoryIds.size > 1)
    .map(([key]) => key));

  const classifier: HouseholdClassifier = (label, kind) => {
    const merchantKey = cardMerchantKey(label);
    if (merchantKey && ambiguousMerchants.has(`${kind}:${merchantKey.replace(/\s+/g, '')}`)) return null;
    const knownMerchant = matchMerchantRule(label, kind, merchantRules);
    if (knownMerchant && activeIds.has(knownMerchant.category_id) &&
      categories.some(category => category.id === knownMerchant.category_id && category.kind === kind)) {
      return {
        categoryId: knownMerchant.category_id,
        subcategoryId: knownMerchant.subcategory_id,
        confidence: 'high',
      };
    }
    const query = tokens(label);
    const training = corpus[kind];
    if (!query.length || !training.length) return null;

    const idf = (word: string) => 1 + Math.log((training.length + 1) / ((documentFrequency[kind].get(word) || 0) + 1));
    const queryWeight = query.reduce((sum, word) => sum + idf(word), 0);
    if (!queryWeight) return null;

    const scores = new Map<string, { best: number; support: number; subcategoryId: string | null }>();
    for (const example of training) {
      const shared = query.filter(word => example.words.includes(word));
      if (!shared.length) continue;
      const sharedWeight = shared.reduce((sum, word) => sum + idf(word), 0);
      const precision = sharedWeight / queryWeight;
      const recall = sharedWeight / example.words.reduce((sum, word) => sum + idf(word), 0);
      const similarity = (2 * precision * recall) / (precision + recall || 1);
      const current = scores.get(example.categoryId) || { best: 0, support: 0, subcategoryId: null };
      current.support += 1;
      if (similarity > current.best) {
        current.best = similarity;
        current.subcategoryId = example.subcategoryId || null;
      }
      scores.set(example.categoryId, current);
    }

    const ranked = [...scores.entries()]
      .filter(([categoryId]) => categories.some(category => category.id === categoryId && category.kind === kind && category.active))
      .map(([categoryId, score]) => ({ categoryId, ...score, score: score.best + Math.min(0.12, Math.log1p(score.support - 1) * 0.04) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const runnerUp = ranked[1]?.score || 0;
    if (!best || best.score < 0.38 || (best.score - runnerUp < 0.07 && best.score < 0.72)) return null;

    return {
      categoryId: best.categoryId,
      subcategoryId: best.subcategoryId,
      confidence: best.score >= 0.72 && best.support >= 2 ? 'high' : 'medium',
    };
  };
  classifier.isAmbiguous = (label, kind) => {
    const merchantKey = cardMerchantKey(label);
    return Boolean(merchantKey && ambiguousMerchants.has(`${kind}:${merchantKey.replace(/\s+/g, '')}`));
  };
  return classifier;
}

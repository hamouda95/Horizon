import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const households = sqliteTable('households', { owner: text('owner').primaryKey(), name: text('name').notNull(), incomeTypes: text('income_types').notNull(), expenseTypes: text('expense_types').notNull() });
export const entries = sqliteTable('entries', { id: text('id').primaryKey(), owner: text('owner').notNull(), kind: text('kind').notNull(), label: text('label').notNull(), category: text('category').notNull(), amount: integer('amount').notNull(), date: text('date').notNull() });

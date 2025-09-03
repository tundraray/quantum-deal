import { relations } from 'drizzle-orm/relations';
import { subscriptions, codes, users } from './schema';

export const codesRelations = relations(codes, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [codes.subscriptionId],
    references: [subscriptions.id],
  }),
  user: one(users, {
    fields: [codes.userId],
    references: [users.telegramId],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ many }) => ({
  codes: many(codes),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  codes: many(codes),
  subscription: one(subscriptions, {
    fields: [users.subscribeId],
    references: [subscriptions.id],
  }),
}));

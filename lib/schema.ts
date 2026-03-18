import { pgTable, text, integer, timestamp, serial } from "drizzle-orm/pg-core";

export const userUsage = pgTable("user_usage", {
    userId: text("user_id").primaryKey(),
    queryCount: integer("query_count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const queryLog = pgTable("query_log", {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    query: text("query").notNull(),
    dataset: text("dataset").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

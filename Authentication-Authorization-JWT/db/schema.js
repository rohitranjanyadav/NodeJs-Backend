import { pgEnum, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 100 }).notNull(),
  email: varchar({ length: 200 }).notNull().unique(),
  role: userRoleEnum().notNull().default("USER"),
  password: text().notNull(),
  salt: text().notNull(),
});

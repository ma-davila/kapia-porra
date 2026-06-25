import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// National teams (48). Knockout placeholder slots are NOT teams — they live as
// labels on the match until the real team is known.
export const teams = pgTable("teams", {
  code: text("code").primaryKey(), // FIFA 3-letter code, e.g. "ESP"
  name: text("name").notNull(),
  flag: text("flag").notNull(), // emoji
  groupLetter: text("group_letter"), // A..L
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  slackId: text("slack_id"), // Slack member ID (e.g. U0123ABCD) for @-mentions
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// All 104 matches (72 group + 32 knockout). id == official match number.
export const matches = pgTable("matches", {
  id: integer("id").primaryKey(), // match number 1..104
  stage: text("stage").notNull(), // group | r32 | r16 | qf | sf | third | final
  groupLetter: text("group_letter"), // A..L for group stage, else null
  matchday: integer("matchday"), // 1..3 within a group, else null
  homeCode: text("home_code"), // null until known (knockout)
  awayCode: text("away_code"),
  homeLabel: text("home_label"), // e.g. "Winner Group A" when team unknown
  awayLabel: text("away_label"),
  kickoff: timestamp("kickoff", { withTimezone: true }).notNull(),
  ground: text("ground"),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  status: text("status").notNull().default("scheduled"), // scheduled | finished
  apiFixtureId: integer("api_fixture_id"), // football-data.org id, for reliable matching
});

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    matchId: integer("match_id").notNull(),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    points: integer("points"), // null until the match is graded
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqUserMatch: unique("uniq_user_match").on(t.userId, t.matchId),
  }),
);

export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type User = typeof users.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;

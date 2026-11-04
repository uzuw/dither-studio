export const LEVELS = [
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
] as const;
export type Day = {
  date: string;
  weekday: number;
  count: number;
  level: number;
};
export type Repository = {
  name: string;
  description: string;
  stars: number;
  forks: number;
};
export type Activity = {
  pullRequests: number;
  reviews: number;
  issues: number;
  commits: number;
};
export type RepositoryStats = {
  totalCount: number;
  stars: number;
  top: Repository[];
};
export type Profile = {
  source: "github" | "sample";
  username: string;
  start: string;
  end: string;
  fetchedAt: string;
  total: number;
  weeks: Day[][];
  activity: Activity | null;
  repositories: RepositoryStats | null;
  stats: { activeDays: number; currentStreak: number; longestStreak: number };
};

export class PublicError extends Error {
  constructor(
    message: string,
    public status = 400,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = "PublicError";
  }
}

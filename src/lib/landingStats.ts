// Landing page marketing figures: always rounded UP to the next thousand
// (6 745 explorers -> 7 000). Never understates the real count.
export const roundUp1000 = (n: number) => Math.ceil(n / 1000) * 1000;

export interface LandingStats {
  totalUsers: number;
  totalCaptures: number;
  speciesCount: number;
}

export const roundLandingStats = (s: LandingStats): LandingStats => ({
  totalUsers: roundUp1000(s.totalUsers),
  totalCaptures: roundUp1000(s.totalCaptures),
  speciesCount: roundUp1000(s.speciesCount),
});

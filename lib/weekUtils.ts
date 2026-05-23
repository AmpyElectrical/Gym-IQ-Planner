export function getCurrentWeek(startDate: Date | string): "1" | "2" {
  const start = new Date(startDate);
  const now = new Date();
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / msPerWeek));
  // Week 1 of program (0 elapsed), Week 2 (1 elapsed), Week 1 again (2 elapsed), ...
  return weeksElapsed % 2 === 0 ? "1" : "2";
}

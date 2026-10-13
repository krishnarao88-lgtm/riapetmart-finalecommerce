// Road to RM100k: website sales goal for 2026 (owner, 13 Oct 2026). Pure maths so it can be tested.
export const SALES_GOAL = { target: 100_000, end: "2026-12-31T23:59:59+08:00", label: "RM100k website sales by 31 Dec 2026" };

export type GoalOrder = { total: number; refunded: number; created_at: string };

const DAY = 86_400_000;

export function goalPace(orders: GoalOrder[], now = new Date(), goal = SALES_GOAL) {
  const net = (o: GoalOrder) => Math.max(0, o.total - o.refunded);
  const sold = orders.reduce((s, o) => s + net(o), 0);
  const last7Sales = orders
    .filter((o) => now.getTime() - new Date(o.created_at).getTime() < 7 * DAY)
    .reduce((s, o) => s + net(o), 0);
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.end).getTime() - now.getTime()) / DAY));
  const remaining = Math.max(0, goal.target - sold);
  const aov = orders.length ? sold / orders.length : 0;
  const needPerDay = daysLeft ? remaining / daysLeft : remaining;
  const pacePerDay = last7Sales / 7;
  return {
    sold,
    remaining,
    daysLeft,
    aov,
    needPerDay,
    needOrdersPerDay: aov ? needPerDay / aov : null,
    pacePerDay,
    projected: sold + pacePerDay * daysLeft,
    pctDone: Math.min(1, sold / goal.target),
    // How many times faster sales must run than the last 7 days to land the goal.
    gap: pacePerDay ? needPerDay / pacePerDay : null,
  };
}

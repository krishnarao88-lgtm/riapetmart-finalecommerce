// EasyParcel shipment status codes (Open API docs, "Shipment Status Codes") and what they mean for our order.

export const EP_STATUS: Record<number, string> = {
  0: "Shipment cancelled",
  2: "To be collected",
  3: "Collected by courier",
  4: "In transit",
  5: "Delivered",
  6: "Returned",
  7: "Scheduled",
  8: "On hold",
  11: "Dropped off",
};

/** Codes that need the owner's attention (red badge); a cancelled shipment can be booked again. */
export const EP_PROBLEM = new Set([0, 6, 8]);
export const EP_CANCELLED = 0;

const RANK = { new: 0, packed: 1, shipped: 2, delivered: 3 } as const;
type Step = keyof typeof RANK;

/**
 * The fulfilment step a courier status moves the order to. Only ever moves forward, and never touches
 * orders the owner cancelled or refunded; problem codes leave the step alone (the badge shows them instead).
 */
export function fulfilmentForEasyParcel(code: number, current: string): Step | null {
  if (!(current in RANK)) return null;
  const target: Step | null = code === 5 ? "delivered" : [3, 4, 11].includes(code) ? "shipped" : code === 2 || code === 7 ? "packed" : null;
  return target && RANK[target] > RANK[current as Step] ? target : null;
}

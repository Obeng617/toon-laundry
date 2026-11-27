import { FulfilmentMethod, OrderStatus } from "./types";

export interface StatusMeta {
  status: OrderStatus;
  label: string;
  shortLabel: string;
  description: string;
  customerMessage: (tagNumber: string) => string;
  badgeClass: string;
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  order_placed: {
    status: "order_placed",
    label: "Order placed",
    shortLabel: "Placed",
    description: "Customer submitted the booking.",
    customerMessage: (tag) => `Your booking ${tag} has been received and is awaiting confirmation.`,
    badgeClass: "bg-sky-50 text-[#264099] border-sky-200",
  },
  order_confirmed: {
    status: "order_confirmed",
    label: "Order confirmed",
    shortLabel: "Confirmed",
    description: "Admin accepted the order.",
    customerMessage: (tag) => `${tag} is confirmed! We are ready for your laundry.`,
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  pickup_scheduled: {
    status: "pickup_scheduled",
    label: "Pickup scheduled",
    shortLabel: "Pickup",
    description: "A Tinoclean pickup has been arranged.",
    customerMessage: (tag) => `Pickup is scheduled for ${tag}. Our rider will contact you on arrival.`,
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200",
  },
  laundry_received: {
    status: "laundry_received",
    label: "Laundry received",
    shortLabel: "Received",
    description: "Laundry is physically at Tinoclean and weighed.",
    customerMessage: (tag) => `Laundry received & weighed for ${tag}. Your digital ticket is ready!`,
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  washing_in_progress: {
    status: "washing_in_progress",
    label: "Washing in progress",
    shortLabel: "Washing",
    description: "Washing has started.",
    customerMessage: (tag) => `Order ${tag} is now being washed.`,
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  drying_in_progress: {
    status: "drying_in_progress",
    label: "Drying in progress",
    shortLabel: "Drying",
    description: "Drying has started.",
    customerMessage: (tag) => `Order ${tag} is now drying.`,
    badgeClass: "bg-orange-50 text-orange-800 border-orange-200",
  },
  ironing_and_folding: {
    status: "ironing_and_folding",
    label: "Ironing and folding",
    shortLabel: "Finishing",
    description: "Finishing work is in progress.",
    customerMessage: (tag) => `Order ${tag} is being ironed and neatly folded.`,
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  ready_for_collection: {
    status: "ready_for_collection",
    label: "Ready for collection",
    shortLabel: "Ready",
    description: "Laundry is ready for customer collection.",
    customerMessage: (tag) => `Great news! Order ${tag} is ready for collection. Bring your tag number.`,
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  out_for_delivery: {
    status: "out_for_delivery",
    label: "Out for delivery",
    shortLabel: "Delivering",
    description: "Laundry has been dispatched for delivery.",
    customerMessage: (tag) => `Order ${tag} is out for delivery! Please have cash or Mobile Money ready.`,
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  completed: {
    status: "completed",
    label: "Completed / Delivered",
    shortLabel: "Completed",
    description: "Customer has received the laundry and settled payment.",
    customerMessage: (tag) => `Order ${tag} is complete. Thank you for choosing Tinoclean!`,
    badgeClass: "bg-green-100 text-green-800 border-green-300",
  },
  rejected: {
    status: "rejected",
    label: "Rejected",
    shortLabel: "Rejected",
    description: "Order could not be accepted.",
    customerMessage: (tag) => `Order ${tag} could not be accepted. Please contact Tinoclean for details.`,
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  cancelled: {
    status: "cancelled",
    label: "Cancelled",
    shortLabel: "Cancelled",
    description: "Order was cancelled.",
    customerMessage: (tag) => `Order ${tag} has been cancelled.`,
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

/**
 * Returns ONLY the relevant milestones for a given fulfilment method (Section 7):
 * - Drop-off orders skip `pickup_scheduled` and `out_for_delivery`.
 * - Pickup orders include `pickup_scheduled` and end in `ready_for_collection` -> `completed`.
 * - Delivery orders skip `pickup_scheduled` (unless added) and include `out_for_delivery` -> `completed`.
 */
export function getWorkflowMilestones(method: FulfilmentMethod): OrderStatus[] {
  if (method === "drop_off") {
    return [
      "order_placed",
      "order_confirmed",
      "laundry_received",
      "washing_in_progress",
      "drying_in_progress",
      "ironing_and_folding",
      "ready_for_collection",
      "completed",
    ];
  }
  if (method === "pickup") {
    return [
      "order_placed",
      "order_confirmed",
      "pickup_scheduled",
      "laundry_received",
      "washing_in_progress",
      "drying_in_progress",
      "ironing_and_folding",
      "ready_for_collection",
      "completed",
    ];
  }
  // delivery
  return [
    "order_placed",
    "order_confirmed",
    "laundry_received",
    "washing_in_progress",
    "drying_in_progress",
    "ironing_and_folding",
    "out_for_delivery",
    "completed",
  ];
}

export function getFulfilmentLabel(method: FulfilmentMethod): string {
  switch (method) {
    case "drop_off":
      return "Customer Drop-off";
    case "pickup":
      return "Tinoclean Pickup";
    case "delivery":
      return "Doorstep Delivery";
  }
}

export function getNextStatus(current: OrderStatus, method: FulfilmentMethod): OrderStatus | null {
  const flow = getWorkflowMilestones(method);
  const idx = flow.indexOf(current);
  if (idx === -1 || idx >= flow.length - 1) return null;
  return flow[idx + 1];
}

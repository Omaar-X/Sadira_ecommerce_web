import { formatCartOptions } from "@/lib/cart";
import { DELIVERY_AREAS, PAYMENT_METHODS } from "@/lib/checkout";
import { toLocalBangladeshiPhone } from "@/lib/phone";
import { formatPrice, getWhatsAppUrl } from "@/lib/utils";
import type { ConfirmedOrder } from "@/types/checkout";

/*
 * WhatsApp confirmation for an order ALREADY SAVED in Google Sheets — built
 * only from the server-confirmed order. A wa.me link just opens a pre-filled
 * chat; the customer decides whether to press Send (the Sheet's
 * whatsapp_confirmation stays "Pending" either way).
 */

export function paymentLabel(order: Pick<ConfirmedOrder, "paymentMethod">): string {
  return PAYMENT_METHODS.find((method) => method.value === order.paymentMethod)?.label ?? order.paymentMethod;
}

export function deliveryAreaLabel(order: Pick<ConfirmedOrder, "delivery">): string {
  return DELIVERY_AREAS.find((area) => area.value === order.delivery.deliveryArea)?.label ?? "";
}

export function buildOrderConfirmationMessage(order: ConfirmedOrder): string {
  const items = order.items.flatMap((item, index) => [
    `${index + 1}. ${item.name}`,
    ...formatCartOptions(item).map((option) => `   ${option.label}: ${option.value}`),
    `   Qty: ${item.quantity}`,
    item.quantity > 1
      ? `   Price: ${formatPrice(item.unitPrice)} × ${item.quantity} = ${formatPrice(item.lineTotal)}`
      : `   Price: ${formatPrice(item.lineTotal)}`,
    "",
  ]);

  return [
    "Assalamu Alaikum,",
    "",
    "I have placed an order from Sadira.",
    "",
    `Order ID: ${order.orderId}`,
    "",
    "Order Items:",
    "",
    ...items,
    `Subtotal: ${formatPrice(order.subtotal)}`,
    `Delivery Charge: ${formatPrice(order.deliveryCharge)} (${deliveryAreaLabel(order)})`,
    ...(order.discount > 0 ? [`Discount: −${formatPrice(order.discount)}`] : []),
    `Total: ${formatPrice(order.total)}`,
    "",
    `Name: ${order.customer.name}`,
    `Phone: ${toLocalBangladeshiPhone(order.customer.phone)}`,
    `Address: ${order.delivery.address}`,
    "",
    `Payment: ${paymentLabel(order)}`,
    "",
    "Please confirm my order.",
  ].join("\n");
}

export function getOrderConfirmationWhatsAppUrl(order: ConfirmedOrder): string {
  return getWhatsAppUrl(buildOrderConfirmationMessage(order));
}

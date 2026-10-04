/** Only Cash on Delivery for now; add methods when a payment integration is planned. */
export type PaymentMethod = "cod";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  size: string | null;
  color: string | null;
  design: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  /** ISO 8601 date string. */
  createdAt: string;
}

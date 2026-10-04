import { calculateCartSubtotal } from "@/lib/cart";
import { normalizeBangladeshiPhone } from "@/lib/phone";
import type { CartItem } from "@/types/cart";
import type {
  CheckoutDraftItem,
  CheckoutErrors,
  CheckoutField,
  CheckoutFormValues,
  CheckoutMode,
  CheckoutOrderDraft,
  DeliveryArea,
  Division,
} from "@/types/checkout";
import type { PaymentMethod } from "@/types/order";

/*
 * Checkout rules — pure, so the next phase's server endpoint can run the same
 * validation on what it receives (it must: browser checks can be bypassed).
 */

export const DIVISIONS: Division[] = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

export const DELIVERY_AREAS: { value: DeliveryArea; label: string }[] = [
  { value: "inside-dhaka", label: "Inside Dhaka" },
  { value: "outside-dhaka", label: "Outside Dhaka" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "cod", label: "Cash on Delivery", description: "Pay when your order is delivered." },
];

/** Also enforced by google-apps-script/Code.gs — keep the two in sync. */
export const LIMITS = {
  name: 80,
  email: 120,
  district: 60,
  area: 80,
  address: 300,
  note: 500,
} as const;

export const EMPTY_CHECKOUT_FORM: CheckoutFormValues = {
  name: "",
  phone: "",
  alternativePhone: "",
  email: "",
  division: "",
  district: "",
  area: "",
  address: "",
  postalCode: "",
  deliveryArea: "",
  // The only method available, so it starts selected.
  paymentMethod: "cod",
  note: "",
};

/** Field order on the page — the first invalid one gets focus. */
export const CHECKOUT_FIELD_ORDER: CheckoutField[] = [
  "name",
  "phone",
  "alternativePhone",
  "email",
  "division",
  "district",
  "area",
  "address",
  "postalCode",
  "deliveryArea",
  "paymentMethod",
  "note",
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const POSTAL_CODE = /^\d{4}$/; // Bangladesh postal codes are 4 digits

const clean = (value: string) => value.trim().replace(/\s+/g, " ");

export function validateCheckout(values: CheckoutFormValues): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const name = clean(values.name);

  if (name.length < 2) errors.name = "Please enter your full name.";
  else if (name.length > LIMITS.name) errors.name = `Name can be up to ${LIMITS.name} characters.`;

  if (!normalizeBangladeshiPhone(values.phone)) errors.phone = "Please enter a valid phone number.";
  if (values.alternativePhone.trim() && !normalizeBangladeshiPhone(values.alternativePhone)) {
    errors.alternativePhone = "Please enter a valid alternative phone number.";
  }
  if (values.email.trim() && (!EMAIL.test(values.email.trim()) || values.email.trim().length > LIMITS.email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!DIVISIONS.includes(values.division as Division)) errors.division = "Please select a division.";
  const district = clean(values.district);
  if (!district) errors.district = "Please enter your district.";
  else if (district.length > LIMITS.district) errors.district = `District can be up to ${LIMITS.district} characters.`;
  const area = clean(values.area);
  if (!area) errors.area = "Please enter your area or thana.";
  else if (area.length > LIMITS.area) errors.area = `Area / Thana can be up to ${LIMITS.area} characters.`;
  if (!values.address.trim()) errors.address = "Please enter your delivery address.";
  else if (values.address.trim().length > LIMITS.address) {
    errors.address = `Address can be up to ${LIMITS.address} characters.`;
  }
  if (values.postalCode.trim() && !POSTAL_CODE.test(values.postalCode.trim())) {
    errors.postalCode = "Please enter a valid 4-digit postal code.";
  }

  if (!DELIVERY_AREAS.some((area) => area.value === values.deliveryArea)) {
    errors.deliveryArea = "Please select a delivery area.";
  }
  if (!PAYMENT_METHODS.some((method) => method.value === values.paymentMethod)) {
    errors.paymentMethod = "Please select a payment method.";
  }
  if (values.note.length > LIMITS.note) errors.note = `Order note can be up to ${LIMITS.note} characters.`;

  return errors;
}

export function firstInvalidField(errors: CheckoutErrors): CheckoutField | null {
  return CHECKOUT_FIELD_ORDER.find((field) => errors[field]) ?? null;
}

/** Normalised customer/delivery/payment details. Call only when validateCheckout() found no errors. */
export function normalizeCheckoutDetails(
  values: CheckoutFormValues,
): Pick<CheckoutOrderDraft, "customer" | "delivery" | "paymentMethod" | "note"> {
  const optional = (value: string) => clean(value) || null;

  return {
    customer: {
      name: clean(values.name),
      phone: normalizeBangladeshiPhone(values.phone)!,
      alternativePhone: values.alternativePhone.trim() ? normalizeBangladeshiPhone(values.alternativePhone) : null,
      email: optional(values.email)?.toLowerCase() ?? null,
    },
    delivery: {
      division: values.division as Division,
      district: clean(values.district),
      area: clean(values.area),
      address: values.address.trim(),
      postalCode: optional(values.postalCode),
      deliveryArea: values.deliveryArea as DeliveryArea,
    },
    paymentMethod: values.paymentMethod as PaymentMethod,
    note: values.note.trim() || null,
  };
}

/** The item identities sent to the server (prices only for change detection). */
export function toDraftItems(items: CartItem[]): CheckoutDraftItem[] {
  return items.map((item) => ({
    productId: item.productId,
    size: item.size,
    color: item.color,
    design: item.design,
    quantity: item.quantity,
    displayedUnitPrice: item.price,
  }));
}

/** Normalised order draft from valid form values + items. */
export function buildCheckoutOrderDraft(
  values: CheckoutFormValues,
  items: CartItem[],
  mode: CheckoutMode,
): CheckoutOrderDraft {
  return {
    mode,
    ...normalizeCheckoutDetails(values),
    items: toDraftItems(items),
    subtotal: calculateCartSubtotal(items),
  };
}

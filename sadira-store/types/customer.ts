export interface Customer {
  id: string;
  name: string;
  /** Normalised Bangladeshi mobile number, e.g. "+8801XXXXXXXXX". */
  phone: string;
  email: string | null;
  address: string;
  /** ISO 8601 date string. */
  createdAt: string;
}

export type CustomerInput = Omit<Customer, "id" | "createdAt">;

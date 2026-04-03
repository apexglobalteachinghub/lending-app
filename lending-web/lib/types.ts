export type UserRole = "admin" | "staff" | "customer";

export type LoanStatus = "pending" | "approved" | "rejected" | "paid";

export type SupportStatus = "open" | "resolved";

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole;
  created_at: string;
  mobile_number: string | null;
  address: string | null;
  reference_person_mobile: string | null;
  reference_relationship: string | null;
};

export type Loan = {
  id: string;
  user_id: string;
  amount: number;
  interest_rate: number;
  total_amount: number;
  status: LoanStatus;
  due_date: string;
  created_at: string;
};

export type Payment = {
  id: string;
  loan_id: string;
  amount_paid: number;
  payment_date: string;
};

export type SupportMessage = {
  id: string;
  user_id: string;
  message: string;
  status: SupportStatus;
  staff_reply: string | null;
  created_at: string;
  updated_at: string;
};

export type DateRangePreset = "7d" | "30d" | "custom";

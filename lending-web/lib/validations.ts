import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "At least 6 characters"),
});

export const loanSchema = z.object({
  user_id: z.string().min(1, "Select a customer").uuid("Select a customer"),
  amount: z.coerce.number().positive(),
  interest_rate: z.coerce.number().min(0).max(100),
  due_date: z.string().min(1),
});

export const supportReplySchema = z.object({
  staff_reply: z.string().min(1, "Reply is required"),
  status: z.enum(["open", "resolved"]),
});

export const profileRoleSchema = z.object({
  role: z.enum(["admin", "staff", "customer"]),
});

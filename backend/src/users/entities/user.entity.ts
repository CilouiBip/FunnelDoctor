export class User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  company_name?: string;
  plan_id: string;
  created_at: Date;
  updated_at: Date;
}

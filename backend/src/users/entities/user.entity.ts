export class User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  company_name?: string;
  plan_id: string;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

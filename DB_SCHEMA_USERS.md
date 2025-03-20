# Structure de la table `users` dans Supabase

## Colonnes

```json
[
  {
    "column_name": "instance_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "uuid_generate_v4()"
  },
  {
    "column_name": "email",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "id",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "aud",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "full_name",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null
  },
  {
    "column_name": "role",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "company_name",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "password_hash",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "email",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "encrypted_password",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "plan_id",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null
  },
  {
    "column_name": "created_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": "CURRENT_TIMESTAMP"
  },
  ...
]
```

## Contraintes

```json
[
  {
    "constraint_name": "users_plan_id_fkey",
    "constraint_type": "FOREIGN KEY",
    "column_name": "plan_id",
    "foreign_table_name": "plans",
    "foreign_column_name": "id"
  },
  {
    "constraint_name": "users_pkey",
    "constraint_type": "PRIMARY KEY",
    "column_name": "id",
    "foreign_table_name": "users",
    "foreign_column_name": "id"
  },
  {
    "constraint_name": "users_email_key",
    "constraint_type": "UNIQUE",
    "column_name": "email",
    "foreign_table_name": "users",
    "foreign_column_name": "email"
  },
  {
    "constraint_name": "users_phone_key",
    "constraint_type": "UNIQUE",
    "column_name": "phone",
    "foreign_table_name": "users",
    "foreign_column_name": "phone"
  }
]
```

## Observations

1. La table a une contrainte de clé étrangère `plan_id` qui pointe vers `plans.id`
2. Contrainte d'unicité sur `email`
3. Colonnes requises: `id`, `email`, `full_name`
4. Le champ `password_hash` est nullable

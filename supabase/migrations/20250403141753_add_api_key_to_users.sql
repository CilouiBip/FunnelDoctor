-- Add the api_key column to the users table
ALTER TABLE public.users
ADD COLUMN api_key UUID DEFAULT NULL;

-- Add a unique constraint to the api_key column
ALTER TABLE public.users
ADD CONSTRAINT users_api_key_unique UNIQUE (api_key);
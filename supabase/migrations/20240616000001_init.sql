-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  full_name text NOT NULL,
  avatar_url text,
  wallet_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  plate text UNIQUE NOT NULL,
  model text NOT NULL DEFAULT 'BYD',
  year integer,
  battery_capacity_kwh numeric,
  consumption_kwh_per_km numeric DEFAULT 0.15,
  created_at timestamptz DEFAULT now()
);

-- Trips
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE CASCADE,
  distance_km numeric NOT NULL,
  consumption_kwh numeric,
  co2_saved_kg numeric,
  trip_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual',
  synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Carbon Credits
CREATE TABLE IF NOT EXISTS public.carbon_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  co2_kg numeric NOT NULL,
  price_per_ton_brl numeric DEFAULT 45.0,
  total_value_brl numeric,
  commission_brl numeric,
  net_value_brl numeric,
  status text DEFAULT 'pending',
  partner_ref text,
  issued_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  amount_brl numeric NOT NULL,
  pix_key text,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Sync Logs
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  source text NOT NULL,
  status text NOT NULL,
  records_synced integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

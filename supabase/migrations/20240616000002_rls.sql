-- RLS Policies for Gold Carbon
-- Ensures users can only see their own data

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Users: can read/update own row
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Vehicles: can CRUD own
CREATE POLICY "vehicles_select_own" ON public.vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vehicles_insert_own" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vehicles_update_own" ON public.vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vehicles_delete_own" ON public.vehicles FOR DELETE USING (auth.uid() = user_id);

-- Trips: can CRUD own
CREATE POLICY "trips_select_own" ON public.trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trips_insert_own" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_update_own" ON public.trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trips_delete_own" ON public.trips FOR DELETE USING (auth.uid() = user_id);

-- Carbon Credits: can CRUD own
CREATE POLICY "credits_select_own" ON public.carbon_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credits_insert_own" ON public.carbon_credits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credits_update_own" ON public.carbon_credits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "credits_delete_own" ON public.carbon_credits FOR DELETE USING (auth.uid() = user_id);

-- Payouts: can CRUD own
CREATE POLICY "payouts_select_own" ON public.payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payouts_insert_own" ON public.payouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payouts_update_own" ON public.payouts FOR UPDATE USING (auth.uid() = user_id);

-- Sync Logs: can CRUD own
CREATE POLICY "sync_select_own" ON public.sync_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sync_insert_own" ON public.sync_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

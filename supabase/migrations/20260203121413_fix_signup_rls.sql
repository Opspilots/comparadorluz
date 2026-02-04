-- Allow anyone to create a company during signup (for test mode)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public company creation"
  ON public.companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Allow users to create their own record in public.users
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

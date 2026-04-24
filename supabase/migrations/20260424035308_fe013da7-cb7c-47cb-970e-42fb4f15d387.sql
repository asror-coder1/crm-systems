
-- ============= AUTH TRIGGER (was missing) =============
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= STORAGE POLICIES =============
-- Avatars (public read)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Org logos (public read)
DROP POLICY IF EXISTS "Org logos are publicly accessible" ON storage.objects;
CREATE POLICY "Org logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

-- ============= INVOICES =============
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  invoice_number text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'UZS',
  status text NOT NULL DEFAULT 'draft',
  description text,
  due_date date,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin manages invoices" ON public.invoices;
CREATE POLICY "super_admin manages invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "org members read invoices" ON public.invoices;
CREATE POLICY "org members read invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org());

DROP TRIGGER IF EXISTS trg_invoices_updated ON public.invoices;
CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= EVENTS (Calendar) =============
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT 'primary',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_org ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_starts ON public.events(starts_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin manages events" ON public.events;
CREATE POLICY "super_admin manages events" ON public.events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "org members read events" ON public.events;
CREATE POLICY "org members read events" ON public.events
  FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id = public.current_user_org());

DROP TRIGGER IF EXISTS trg_events_updated ON public.events;
CREATE TRIGGER trg_events_updated
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= MESSAGES =============
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  is_broadcast boolean NOT NULL DEFAULT false,
  parent_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super_admin manages messages" ON public.messages;
CREATE POLICY "super_admin manages messages" ON public.messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "users read own messages" ON public.messages;
CREATE POLICY "users read own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    recipient_id = auth.uid()
    OR sender_id = auth.uid()
    OR (is_broadcast = true AND (organization_id IS NULL OR organization_id = public.current_user_org()))
  );

DROP POLICY IF EXISTS "users send messages" ON public.messages;
CREATE POLICY "users send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND is_broadcast = false);

-- Message reads tracking
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own reads" ON public.message_reads;
CREATE POLICY "users manage own reads" ON public.message_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

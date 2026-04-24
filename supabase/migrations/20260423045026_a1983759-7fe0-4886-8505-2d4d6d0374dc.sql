-- ============== NOTIFICATIONS ==============
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'info', -- info | success | warning | error
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user updates own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user deletes own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "super_admin manages notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============== AUDIT LOGS ==============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_username text,
  action text NOT NULL,         -- e.g. 'org.create', 'user.delete'
  entity_type text NOT NULL,    -- e.g. 'organization', 'user'
  entity_id text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin reads audit"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "super_admin writes audit"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Helper to insert audit row from any session
CREATE OR REPLACE FUNCTION public.write_audit(
  _action text,
  _entity_type text,
  _entity_id text,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username text;
BEGIN
  SELECT username INTO _username FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.audit_logs(actor_id, actor_username, action, entity_type, entity_id, meta)
  VALUES (auth.uid(), _username, _action, _entity_type, _entity_id, _meta);
END;
$$;

-- Helper for sending notifications (callable from triggers / edge functions)
CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id uuid,
  _title text,
  _body text DEFAULT NULL,
  _type text DEFAULT 'info',
  _link text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.notifications(user_id, title, body, type, link)
  VALUES (_user_id, _title, _body, _type, _link)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Trigger: notify all super_admins when a new organization is created
CREATE OR REPLACE FUNCTION public.notify_org_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin record;
BEGIN
  FOR _admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'super_admin'
  LOOP
    PERFORM public.send_notification(
      _admin.user_id,
      'Yangi tashkilot qo''shildi',
      NEW.name || ' tizimga ulandi',
      'success',
      '/super-admin/organizations'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_org_created ON public.organizations;
CREATE TRIGGER trg_notify_org_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.notify_org_created();

-- ============== STORAGE BUCKETS ==============
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: avatars (users can upload to their own folder)
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies: org-logos (super_admin manages, public read)
CREATE POLICY "Org logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-logos');

CREATE POLICY "Super admins manage org logos"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'org-logos'
    AND public.has_role(auth.uid(), 'super_admin')
  )
  WITH CHECK (
    bucket_id = 'org-logos'
    AND public.has_role(auth.uid(), 'super_admin')
  );
-- Add telegram_chat_id to profiles (for admin/administrator notifications)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Add telegram_chat_id to organizations (org-level fallback)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Add receipt fields to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Create receipts storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipts bucket
-- Path convention: {organization_id}/{student_id}/{filename}

-- Students can upload receipts under their own folder
CREATE POLICY "Students upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Students can read their own receipts
CREATE POLICY "Students read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Org managers can read receipts in their org
CREATE POLICY "Org managers read org receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_org_manager(((storage.foldername(name))[1])::uuid)
);

-- Super admin reads all receipts
CREATE POLICY "Super admin reads all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.has_role(auth.uid(), 'super_admin')
);

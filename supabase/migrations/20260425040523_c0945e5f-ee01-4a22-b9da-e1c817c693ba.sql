-- Helper: check if current user is admin or administrator of given org
CREATE OR REPLACE FUNCTION public.is_org_manager(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND organization_id = _org_id
      AND role IN ('admin', 'administrator')
  )
$$;

-- EVENTS: org managers (admin/administrator) can manage events for their org
DROP POLICY IF EXISTS "org managers manage events" ON public.events;
CREATE POLICY "org managers manage events"
ON public.events
FOR ALL
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_manager(organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_manager(organization_id)
);

-- PROFILES: org managers can update profiles in their org
DROP POLICY IF EXISTS "org managers update org profiles" ON public.profiles;
CREATE POLICY "org managers update org profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_manager(organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_manager(organization_id)
);

-- USER_ROLES: org managers can read roles in their org (so they can see teachers/students)
DROP POLICY IF EXISTS "org managers read org roles" ON public.user_roles;
CREATE POLICY "org managers read org roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_manager(organization_id)
);

-- MESSAGES: keep existing; ensure broadcasts can be sent by org managers within their org
DROP POLICY IF EXISTS "org managers send broadcasts" ON public.messages;
CREATE POLICY "org managers send broadcasts"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    is_broadcast = false
    OR (
      is_broadcast = true
      AND organization_id IS NOT NULL
      AND public.is_org_manager(organization_id)
    )
  )
);
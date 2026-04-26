-- GROUPS
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'primary',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_groups_org ON public.groups(organization_id);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read groups" ON public.groups FOR SELECT TO authenticated USING (organization_id = current_user_org());
CREATE POLICY "org managers manage groups" ON public.groups FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));
CREATE POLICY "super_admin manages groups" ON public.groups FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUBJECTS
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  color text NOT NULL DEFAULT 'primary',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subjects_org ON public.subjects(organization_id);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read subjects" ON public.subjects FOR SELECT TO authenticated USING (organization_id = current_user_org());
CREATE POLICY "org managers manage subjects" ON public.subjects FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));
CREATE POLICY "super_admin manages subjects" ON public.subjects FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER trg_subjects_updated BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- GROUP TEACHERS (must come before group_members policy that references it)
CREATE TABLE public.group_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, teacher_id, subject_id)
);
CREATE INDEX idx_gt_teacher ON public.group_teachers(teacher_id);
CREATE INDEX idx_gt_group ON public.group_teachers(group_id);
ALTER TABLE public.group_teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read group_teachers" ON public.group_teachers FOR SELECT TO authenticated USING (organization_id = current_user_org());
CREATE POLICY "org managers manage group_teachers" ON public.group_teachers FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));

-- Helper function: is teacher of group
CREATE OR REPLACE FUNCTION public.is_group_teacher(_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_teachers WHERE group_id = _group_id AND teacher_id = auth.uid())
$$;

-- GROUP MEMBERS
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, student_id)
);
CREATE INDEX idx_gm_student ON public.group_members(student_id);
CREATE INDEX idx_gm_group ON public.group_members(group_id);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read group_members" ON public.group_members FOR SELECT TO authenticated USING (organization_id = current_user_org());
CREATE POLICY "org managers manage group_members" ON public.group_members FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));
CREATE POLICY "teachers read own group members" ON public.group_members FOR SELECT TO authenticated USING (public.is_group_teacher(group_id));

-- LESSONS
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id uuid,
  title text NOT NULL,
  description text,
  room text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_canceled boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_group ON public.lessons(group_id);
CREATE INDEX idx_lessons_teacher ON public.lessons(teacher_id);
CREATE INDEX idx_lessons_starts ON public.lessons(starts_at);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read lessons" ON public.lessons FOR SELECT TO authenticated USING (organization_id = current_user_org());
CREATE POLICY "org managers manage lessons" ON public.lessons FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));
CREATE POLICY "teachers manage own lessons" ON public.lessons FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ATTENDANCE
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  status public.attendance_status NOT NULL DEFAULT 'present',
  note text,
  marked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);
CREATE INDEX idx_attendance_student ON public.attendance(student_id);
CREATE INDEX idx_attendance_lesson ON public.attendance(lesson_id);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read own attendance" ON public.attendance FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "org managers manage attendance" ON public.attendance FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));
CREATE POLICY "teachers manage attendance for own lessons" ON public.attendance FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = attendance.lesson_id AND l.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = attendance.lesson_id AND l.teacher_id = auth.uid()));
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.notify_attendance_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _lesson record; _title text; _type text;
BEGIN
  IF NEW.status IN ('absent', 'late') THEN
    SELECT l.title INTO _lesson FROM public.lessons l WHERE l.id = NEW.lesson_id;
    IF NEW.status = 'absent' THEN
      _title := 'Darsda kelmadingiz: ' || COALESCE(_lesson.title, 'Dars'); _type := 'warning';
    ELSE
      _title := 'Darsga kech keldingiz: ' || COALESCE(_lesson.title, 'Dars'); _type := 'info';
    END IF;
    PERFORM public.send_notification(NEW.student_id, _title, COALESCE(NEW.note, 'Iltimos o''qituvchingiz bilan bog''laning'), _type, '/student/attendance');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_attendance_notify AFTER INSERT OR UPDATE OF status ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.notify_attendance_change();

-- GRADES
CREATE TABLE public.grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL,
  score numeric(5,2) NOT NULL,
  max_score numeric(5,2) NOT NULL DEFAULT 100,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_grades_student ON public.grades(student_id);
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read own grades" ON public.grades FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "teachers manage grades they gave" ON public.grades FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "org managers manage grades" ON public.grades FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));
CREATE TRIGGER trg_grades_updated BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.notify_new_grade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.send_notification(NEW.student_id, 'Yangi baho: ' || NEW.score || '/' || NEW.max_score, COALESCE(NEW.comment, 'Yangi baho qoʻyildi'), 'success', '/student/grades');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_grades_notify AFTER INSERT ON public.grades FOR EACH ROW EXECUTE FUNCTION public.notify_new_grade();

-- FEEDBACKS
CREATE TYPE public.feedback_type AS ENUM ('positive', 'negative', 'neutral');
CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  type public.feedback_type NOT NULL DEFAULT 'positive',
  title text NOT NULL,
  body text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedbacks_student ON public.feedbacks(student_id);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read own feedback" ON public.feedbacks FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "teachers manage own feedback" ON public.feedbacks FOR ALL TO authenticated USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "org managers read feedback" ON public.feedbacks FOR SELECT TO authenticated USING (is_org_manager(organization_id));

CREATE OR REPLACE FUNCTION public.notify_new_feedback()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.send_notification(NEW.student_id,
    CASE NEW.type WHEN 'positive' THEN '👍 Ijobiy fikr' WHEN 'negative' THEN '⚠️ Salbiy fikr' ELSE '💬 Yangi fikr' END || ': ' || NEW.title,
    NEW.body,
    CASE NEW.type WHEN 'positive' THEN 'success' WHEN 'negative' THEN 'warning' ELSE 'info' END,
    '/student/feedback');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_feedbacks_notify AFTER INSERT ON public.feedbacks FOR EACH ROW EXECUTE FUNCTION public.notify_new_feedback();

-- CHAT
CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text,
  is_group boolean NOT NULL DEFAULT false,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_participants (
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz,
  PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX idx_cp_user ON public.chat_participants(user_id);
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cm_thread ON public.chat_messages(thread_id, created_at);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE thread_id = _thread_id AND user_id = auth.uid())
$$;

CREATE POLICY "participants read threads" ON public.chat_threads FOR SELECT TO authenticated USING (public.is_thread_participant(id) OR is_org_manager(organization_id));
CREATE POLICY "org members create threads" ON public.chat_threads FOR INSERT TO authenticated WITH CHECK (organization_id = current_user_org() AND created_by = auth.uid());
CREATE POLICY "creator updates threads" ON public.chat_threads FOR UPDATE TO authenticated USING (created_by = auth.uid() OR is_org_manager(organization_id));

CREATE POLICY "participants read participants" ON public.chat_participants FOR SELECT TO authenticated USING (public.is_thread_participant(thread_id) OR user_id = auth.uid());
CREATE POLICY "thread creator manages participants" ON public.chat_participants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (t.created_by = auth.uid() OR is_org_manager(t.organization_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND (t.created_by = auth.uid() OR is_org_manager(t.organization_id))));
CREATE POLICY "self updates last_read" ON public.chat_participants FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "participants read messages" ON public.chat_messages FOR SELECT TO authenticated USING (public.is_thread_participant(thread_id));
CREATE POLICY "participants send messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.is_thread_participant(thread_id));
CREATE POLICY "sender deletes own messages" ON public.chat_messages FOR DELETE TO authenticated USING (sender_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'UZS',
  provider text NOT NULL DEFAULT 'click',
  provider_transaction_id text,
  click_trans_id bigint,
  click_paydoc_id bigint,
  merchant_trans_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  error_code int,
  error_note text,
  performed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_student ON public.payments(student_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students read own payments" ON public.payments FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "students create own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid() AND organization_id = current_user_org());
CREATE POLICY "org managers manage payments" ON public.payments FOR ALL TO authenticated USING (is_org_manager(organization_id)) WITH CHECK (is_org_manager(organization_id));
CREATE POLICY "super_admin manages payments" ON public.payments FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
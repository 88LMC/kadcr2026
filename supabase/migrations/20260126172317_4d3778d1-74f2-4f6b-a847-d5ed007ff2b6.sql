-- Create function for user activity stats (for Equipo view)
CREATE OR REPLACE FUNCTION get_user_activity_stats(p_user_id UUID)
RETURNS TABLE (
  total_activities BIGINT,
  completed_this_week BIGINT,
  pending_activities BIGINT,
  overdue_activities BIGINT,
  blocked_activities BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_activities,
    COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE - 7) as completed_this_week,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_activities,
    COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_date < CURRENT_DATE) as overdue_activities,
    COUNT(*) FILTER (WHERE status = 'blocked') as blocked_activities
  FROM activities
  WHERE assigned_to = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create policy for managers to view all user profiles
CREATE POLICY "Managers can view all profiles" 
ON public.user_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.id = auth.uid() AND up.role = 'manager'
  )
);
-- Function to get eligible prospects for daily calls
-- Returns prospects that:
-- 1. Are in 'Prospección' phase
-- 2. Don't have pending activities in the next 7 days
-- 3. Don't have completed activities in the last 3 days
-- 4. Don't have system-generated calls in the last 2 days

CREATE OR REPLACE FUNCTION public.get_prospects_for_daily_calls()
RETURNS TABLE (
  id UUID,
  company_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.company_name
  FROM prospects p
  WHERE p.current_phase = 'Prospección'
    -- No pending activities in next 7 days
    AND NOT EXISTS (
      SELECT 1 FROM activities a
      WHERE a.prospect_id = p.id
        AND a.status = 'pending'
        AND a.scheduled_date <= (CURRENT_DATE + INTERVAL '7 days')
    )
    -- No completed activities in last 3 days
    AND NOT EXISTS (
      SELECT 1 FROM activities a
      WHERE a.prospect_id = p.id
        AND a.status = 'completed'
        AND a.completed_at >= (CURRENT_DATE - INTERVAL '3 days')
    )
    -- No system-generated calls in last 2 days
    AND NOT EXISTS (
      SELECT 1 FROM activities a
      WHERE a.prospect_id = p.id
        AND a.activity_type = 'Llamada'
        AND a.created_by = 'system'
        AND a.created_at >= (CURRENT_DATE - INTERVAL '2 days')
    )
  ORDER BY RANDOM()
  LIMIT 3;
END;
$$;
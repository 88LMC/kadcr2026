-- Drop and recreate the log_activity_change function with expanded details
CREATE OR REPLACE FUNCTION public.log_activity_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'create',
      'activity',
      NEW.id,
      jsonb_build_object(
        'prospect_name', (SELECT company_name FROM prospects WHERE id = NEW.prospect_id),
        'activity_type', NEW.activity_type,
        'scheduled_date', NEW.scheduled_date,
        'notes', NEW.notes,
        'assigned_to_name', (SELECT full_name FROM user_profiles WHERE id = NEW.assigned_to)
      )
    );
    RETURN NEW;
  
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, details)
      VALUES (
        auth.uid(),
        'complete',
        'activity',
        NEW.id,
        jsonb_build_object(
          'prospect_name', (SELECT company_name FROM prospects WHERE id = NEW.prospect_id),
          'activity_type', NEW.activity_type,
          'scheduled_date', NEW.scheduled_date,
          'completion_comment', NEW.completion_comment,
          'completed_at', NEW.completed_at,
          'notes', NEW.notes
        )
      );
    
    ELSIF NEW.status = 'blocked' AND OLD.status != 'blocked' THEN
      INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, details)
      VALUES (
        auth.uid(),
        'block',
        'activity',
        NEW.id,
        jsonb_build_object(
          'prospect_name', (SELECT company_name FROM prospects WHERE id = NEW.prospect_id),
          'activity_type', NEW.activity_type,
          'scheduled_date', NEW.scheduled_date,
          'block_reason', NEW.block_reason
        )
      );
    END IF;
    
    RETURN NEW;
  END IF;
END;
$function$;
-- Migration 75: Tighten coach RLS on events to only allow managing events
-- for programs/sub_programs/groups they are actually assigned to.

DROP POLICY IF EXISTS "coaches_manage_events" ON events;

CREATE POLICY "coaches_manage_events" ON events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      JOIN coaches c ON c.profile_id = p.id
      WHERE p.id = auth.uid()
        AND p.role = 'coach'
        AND p.club_id = events.club_id
        AND (
          -- Club-wide event (no sub_program) — any coach in the club can manage
          events.sub_program_id IS NULL

          -- Coach is directly assigned to this sub_program
          OR EXISTS (
            SELECT 1 FROM coach_assignments ca
            WHERE ca.coach_id = c.id
              AND ca.sub_program_id = events.sub_program_id
              AND ca.deleted_at IS NULL
          )

          -- Coach is assigned to the program that owns this sub_program
          OR EXISTS (
            SELECT 1 FROM coach_assignments ca
            JOIN sub_programs sp ON sp.id = events.sub_program_id
            WHERE ca.coach_id = c.id
              AND ca.program_id = sp.program_id
              AND ca.deleted_at IS NULL
          )

          -- Coach is assigned to the specific group on this event
          OR (
            events.group_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM coach_assignments ca
              WHERE ca.coach_id = c.id
                AND ca.group_id = events.group_id
                AND ca.deleted_at IS NULL
            )
          )
        )
    )
  );

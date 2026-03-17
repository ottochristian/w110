-- Migration 74: Add group_id to events for fine-grained group-level scheduling
ALTER TABLE events ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS events_group_idx ON events(group_id);

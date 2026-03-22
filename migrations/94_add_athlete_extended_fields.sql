-- Migration 94: Add extended athlete profile fields
-- Adds grade, school, photo release, discipline preference,
-- split medical fields (allergies/medications), and additional
-- competitive body IDs sourced from SkiAdminPro import.

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS grade            text,
  ADD COLUMN IF NOT EXISTS school           text,
  ADD COLUMN IF NOT EXISTS photo_release_consent boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_discipline text,
  ADD COLUMN IF NOT EXISTS allergies        text,
  ADD COLUMN IF NOT EXISTS medications      text,
  ADD COLUMN IF NOT EXISTS ifsa_id          text,
  ADD COLUMN IF NOT EXISTS usasa_id         text,
  ADD COLUMN IF NOT EXISTS cssa_id          text,
  ADD COLUMN IF NOT EXISTS nhra_id          text,
  ADD COLUMN IF NOT EXISTS usba_id          text;

-- Add comments for clarity
COMMENT ON COLUMN athletes.grade IS 'School grade (e.g. Kindergarten, 1st, 2nd ... 12th)';
COMMENT ON COLUMN athletes.school IS 'School name';
COMMENT ON COLUMN athletes.photo_release_consent IS 'Whether the family consents to photo/media use';
COMMENT ON COLUMN athletes.preferred_discipline IS 'Athlete primary discipline (Alpine, Freeride, Nordic, Snowboard)';
COMMENT ON COLUMN athletes.allergies IS 'Known allergies (separate from general medical_notes)';
COMMENT ON COLUMN athletes.medications IS 'Current medications (separate from general medical_notes)';
COMMENT ON COLUMN athletes.ifsa_id IS 'International Freeskiers & Snowboarders Association ID';
COMMENT ON COLUMN athletes.usasa_id IS 'US of America Snowboard Association ID';
COMMENT ON COLUMN athletes.cssa_id IS 'Canadian Ski & Snowboard Association ID';
COMMENT ON COLUMN athletes.nhra_id IS 'National Hockey & Racquet Association ID';
COMMENT ON COLUMN athletes.usba_id IS 'United States Biathlon Association ID';

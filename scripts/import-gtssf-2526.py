#!/usr/bin/env python3
"""
Import GTSSF 2025-2026 athletes, households, guardians, and registrations
from the SkiAdminPro CSV export.

Usage:
  pip install psycopg2-binary python-dotenv
  python scripts/import-gtssf-2526.py --dry-run   # preview without writing
  python scripts/import-gtssf-2526.py              # run the import
"""

import csv
import sys
import uuid
import argparse
import os
from datetime import datetime, date
from collections import defaultdict

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("Missing psycopg2. Run: pip install psycopg2-binary")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────

CSV_PATH = os.path.join(
    os.path.expanduser("~"),
    "Downloads",
    "Everything for Otti  Grand Targhee Ski  Snowboard-2.csv",
)

# From the DB setup above
CLUB_ID   = "369efde6-cfad-4786-b176-fe691c0470b8"
SEASON_ID = "de9027b6-ca5b-4f0f-906d-37a4197f0765"
SEASON_LABEL = "2025-2026"

# CSV Discipline → sub_program name → sub_program UUID
SUB_PROGRAM_MAP = {
    # Flow
    "Alpine Flow U6-U8 (14 weeks)":                    "4cb2fd34-f7b1-476a-9574-b1f559505af2",
    "U8-U12 Alpine Flow (16 weeks)":                   "a344ed6a-d924-4ae6-b14d-2827955d401e",
    # Freeride
    "Fridays Only":                                    None,   # resolved by discipline below
    "Saturdays Only OR, Saturdays with option to add day(s) at a reduced rate": None,
    "Sundays Only":                                    None,
    # Nordic XC
    "U6 XC Flow":                                      "59da52c8-2a1e-4609-a884-6603baa664d9",
    "U8-U12 XC Flow":                                  "b2b5cd67-ece9-45a4-af0d-38e6905c1750",
    "XC Prep":                                         "d6d1aa0d-bea2-4b01-8def-1236e8cf7650",
    # Alpine Race
    "3 Days Race Training":                            "3195c9e6-0316-4fe1-8a58-7325b1c499c2",
    "4 Days Race Training":                            "08d56fc1-ca1e-494d-b0bb-cf964321d638",
    "5 Days Race Training":                            "3aac9619-d43e-4295-9249-c5a446ec3238",
    # Snowboard (day-based, same CSV names as Freeride — resolved by discipline)
}

# Discipline-aware lookup for day-of-week programs shared between Freeride/Snowboard
DAY_PROGRAM_MAP = {
    "Freeride": {
        "Fridays Only":    "4797d020-8039-4cf0-a075-225556f783ec",
        "Saturdays Only OR, Saturdays with option to add day(s) at a reduced rate": "0c0eb57e-d1f2-41c6-921c-4a3af5a619ad",
        "Sundays Only":    "2627382b-16bf-41ba-8419-981ab5709d3a",
    },
    "Snowboard": {
        "Fridays Only":    "fb30219c-d808-4732-af6f-4fb645ee091e",
        "Saturdays Only OR, Saturdays with option to add day(s) at a reduced rate": "d59b1a7f-e648-4c8d-87c5-362cf4599214",
        "Sundays Only":    "288bc376-101c-4985-a9bd-8a9c995777d6",
    },
}

SKIP_DISCIPLINES = {"Dry Land /Trampoline Sessions"}

# ── Helpers ───────────────────────────────────────────────────────────────────

def clean(val):
    return val.strip() if val else ""

def none_if_empty(val):
    v = clean(val)
    return v if v and v.lower() not in ("none", "n/a", "na", "") else None

def parse_date(val):
    v = clean(val)
    if not v:
        return None
    try:
        return datetime.strptime(v, "%Y-%m-%d").date()
    except ValueError:
        return None

def normalize_phone(val):
    v = clean(val)
    return v if v else None

def get_sub_program_id(discipline, program):
    # Day-of-week programs resolved by discipline
    if discipline in DAY_PROGRAM_MAP and program in DAY_PROGRAM_MAP[discipline]:
        return DAY_PROGRAM_MAP[discipline][program]
    return SUB_PROGRAM_MAP.get(program)

def split_guardian_name(full_name):
    """Best-effort split 'First Last' → (first, last)."""
    parts = clean(full_name).split()
    if len(parts) >= 2:
        return " ".join(parts[:-1]), parts[-1]
    return clean(full_name), ""

# ── Load CSV ──────────────────────────────────────────────────────────────────

def load_rows():
    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [r for r in reader if r["Season"].strip() == "2025-2026"]

# ── Main import ───────────────────────────────────────────────────────────────

def run(conn, rows, dry_run=False):
    cur = conn.cursor()

    # Track what we've already inserted (dedup by source IDs)
    household_map = {}   # csv Household ID → our UUID
    athlete_map   = {}   # csv User ID      → our UUID
    guardian_map  = {}   # guardian email   → profile UUID

    # ── 1. Households ─────────────────────────────────────────────────────────
    print("\n── Households ────────────────────────────────────────────────")
    households_to_insert = []
    seen_hh = set()

    for row in rows:
        hh_csv_id = clean(row["Household ID"])
        if hh_csv_id in seen_hh:
            continue
        seen_hh.add(hh_csv_id)

        hh_uuid = str(uuid.uuid4())
        household_map[hh_csv_id] = hh_uuid

        primary_email = clean(row["Guardian 1 Email"]).lower() or None
        phone         = normalize_phone(row["Guardian 1 Phone"])
        addr1         = none_if_empty(row["Street Address 1"])
        addr2         = none_if_empty(row["Street Address 2"])
        city          = none_if_empty(row["City"])
        state         = none_if_empty(row["State/Province"])
        zipcode       = none_if_empty(row["Postal Code"])

        households_to_insert.append((
            hh_uuid, CLUB_ID, primary_email, phone,
            addr1, addr2, city, state, zipcode,
        ))

    print(f"  Households to insert: {len(households_to_insert)}")
    if not dry_run:
        execute_values(cur, """
            INSERT INTO households
              (id, club_id, primary_email, phone,
               address_line1, address_line2, city, state, zip_code)
            VALUES %s
            ON CONFLICT DO NOTHING
        """, households_to_insert)

    # ── 2. Guardian profiles ───────────────────────────────────────────────────
    print("\n── Guardian profiles ─────────────────────────────────────────")
    profiles_to_insert = []
    hh_guardian_links  = []   # (household_id, profile_id, is_primary)
    seen_emails = {}          # email → profile_uuid

    for row in rows:
        hh_csv_id = clean(row["Household ID"])
        hh_uuid   = household_map.get(hh_csv_id)
        if not hh_uuid:
            continue

        for guardian_num, is_primary in [(1, True), (2, False)]:
            suffix = "" if guardian_num == 1 else " 2"
            name_key   = f"Guardian {guardian_num} Name"
            email_key  = f"Guardian {guardian_num} Email"
            phone_key  = f"Guardian {guardian_num} Phone"

            email = clean(row.get(email_key, "")).lower()
            if not email:
                continue

            if email in seen_emails:
                # Already created — just add household link if new
                profile_uuid = seen_emails[email]
            else:
                full_name = clean(row.get(name_key, ""))
                first, last = split_guardian_name(full_name)
                phone = normalize_phone(row.get(phone_key, ""))
                profile_uuid = str(uuid.uuid4())
                seen_emails[email] = profile_uuid
                guardian_map[email] = profile_uuid

                profiles_to_insert.append((
                    profile_uuid, email, first, last, phone,
                    "parent", CLUB_ID,
                ))

            link_key = (hh_uuid, profile_uuid)
            if link_key not in {(l[0], l[1]) for l in hh_guardian_links}:
                hh_guardian_links.append((hh_uuid, profile_uuid, is_primary, CLUB_ID))

    print(f"  Guardian profiles to insert: {len(profiles_to_insert)}")
    print(f"  Household-guardian links:    {len(hh_guardian_links)}")

    if not dry_run:
        # NOTE: profiles.id normally mirrors auth.users.id.
        # For imported guardians we insert stub profiles (no auth account).
        # They will be invited/merged when the guardian first signs up.
        execute_values(cur, """
            INSERT INTO profiles
              (id, email, first_name, last_name, phone, role, club_id)
            VALUES %s
            ON CONFLICT (email) DO NOTHING
        """, profiles_to_insert)

        execute_values(cur, """
            INSERT INTO household_guardians
              (id, household_id, user_id, is_primary, club_id)
            VALUES %s
            ON CONFLICT DO NOTHING
        """, [(str(uuid.uuid4()), hh, uid, prim, club)
              for hh, uid, prim, club in hh_guardian_links])

    # ── 3. Athletes ───────────────────────────────────────────────────────────
    print("\n── Athletes ──────────────────────────────────────────────────")
    athletes_to_insert = []
    seen_athletes = set()

    for row in rows:
        user_csv_id = clean(row["User ID"])
        if user_csv_id in seen_athletes:
            continue
        seen_athletes.add(user_csv_id)

        hh_csv_id = clean(row["Household ID"])
        hh_uuid   = household_map.get(hh_csv_id)

        athlete_uuid = str(uuid.uuid4())
        athlete_map[user_csv_id] = athlete_uuid

        first     = clean(row["First Name"])
        last      = clean(row["Last Name"])
        dob       = parse_date(row["Birthday"])
        gender    = none_if_empty(row["Gender"])
        ussa      = none_if_empty(row["USSS"])
        fis       = none_if_empty(row["FIS ID"])
        allergies = none_if_empty(row["Allergies"])
        meds      = none_if_empty(row["Medications"])
        other_med = none_if_empty(row["Other Medical Information"])
        # Combine any remaining medical notes into medical_notes
        medical_notes = " | ".join(filter(None, [other_med])) or None

        photo_consent = row.get("Photo Release Consent", "").strip().lower()
        photo_release = photo_consent != "no, i do not consent."

        grade      = none_if_empty(row.get("Grade", ""))
        school     = none_if_empty(row.get("School", ""))
        discipline = none_if_empty(row.get("Type of Athlete", ""))

        cssa = none_if_empty(row.get("CSSA", ""))
        ifsa = none_if_empty(row.get("IFSA", ""))
        nhra = none_if_empty(row.get("NHRA", ""))
        usasa = none_if_empty(row.get("USASA", ""))
        usba  = none_if_empty(row.get("USBA", ""))

        athletes_to_insert.append((
            athlete_uuid, first, last, dob, gender,
            ussa, fis, medical_notes, CLUB_ID, hh_uuid,
            photo_release, grade, school, discipline,
            allergies, meds,
            ifsa, usasa, cssa, nhra, usba,
        ))

    print(f"  Athletes to insert: {len(athletes_to_insert)}")
    if not dry_run:
        execute_values(cur, """
            INSERT INTO athletes
              (id, first_name, last_name, date_of_birth, gender,
               ussa_number, fis_license, medical_notes, club_id, household_id,
               photo_release_consent, grade, school, preferred_discipline,
               allergies, medications,
               ifsa_id, usasa_id, cssa_id, nhra_id, usba_id)
            VALUES %s
            ON CONFLICT DO NOTHING
        """, athletes_to_insert)

    # ── 4. Registrations ──────────────────────────────────────────────────────
    print("\n── Registrations ─────────────────────────────────────────────")
    registrations_to_insert = []
    skipped = []

    for row in rows:
        discipline = clean(row["Discipline"])
        if discipline in SKIP_DISCIPLINES:
            continue

        program_name = clean(row["Program"])
        sub_prog_id  = get_sub_program_id(discipline, program_name)
        if not sub_prog_id:
            skipped.append(f"{discipline} | {program_name}")
            continue

        user_csv_id = clean(row["User ID"])
        athlete_id  = athlete_map.get(user_csv_id)
        if not athlete_id:
            continue

        reg_date = parse_date(row["Date Added to Roster"])

        registrations_to_insert.append((
            str(uuid.uuid4()), athlete_id, sub_prog_id, None,
            SEASON_LABEL, "active",
            reg_date, "pending", CLUB_ID, SEASON_ID,
        ))

    print(f"  Registrations to insert: {len(registrations_to_insert)}")
    if skipped:
        unique_skipped = sorted(set(skipped))
        print(f"  Skipped (no sub_program match): {len(skipped)} rows")
        for s in unique_skipped:
            print(f"    • {s}")

    if not dry_run:
        execute_values(cur, """
            INSERT INTO registrations
              (id, athlete_id, sub_program_id, group_id,
               season, status, registration_date, payment_status, club_id, season_id)
            VALUES %s
            ON CONFLICT DO NOTHING
        """, registrations_to_insert)

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n── Summary ───────────────────────────────────────────────────")
    print(f"  Households:    {len(households_to_insert)}")
    print(f"  Guardians:     {len(profiles_to_insert)}")
    print(f"  Athletes:      {len(athletes_to_insert)}")
    print(f"  Registrations: {len(registrations_to_insert)}")

    if dry_run:
        print("\n  [DRY RUN] No data was written.")
        conn.rollback()
    else:
        conn.commit()
        print("\n  ✓ Import committed.")

# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument(
        "--db-url",
        default=os.environ.get("DATABASE_URL", ""),
        help="Postgres connection string (or set DATABASE_URL env var)",
    )
    args = parser.parse_args()

    if not args.db_url:
        print("Error: provide --db-url or set DATABASE_URL env var.")
        print("  Find it in Supabase: Settings → Database → Connection string (URI mode)")
        sys.exit(1)

    rows = load_rows()
    print(f"Loaded {len(rows)} rows for season 2025-2026")

    conn = psycopg2.connect(args.db_url)
    try:
        run(conn, rows, dry_run=args.dry_run)
    finally:
        conn.close()

if __name__ == "__main__":
    main()

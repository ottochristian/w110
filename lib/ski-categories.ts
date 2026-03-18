/**
 * Ski age category utilities
 *
 * FIS/USSA standard: competition age = season end year − birth year
 * The "season end year" for North American alpine is the second calendar year
 * in the season name (e.g. 2025-26 → end year 2026).
 *
 * Reference:
 *   US Ski & Snowboard Alpine Technical Package:
 *   https://usskiandsnowboard.org/sport-programs/alpine/alpine-officials
 *
 *   FIS Alpine Rules / ICR:
 *   https://www.fis-ski.com/en/inside-fis/document-library/alpine-skiing
 */

export type AgeCalculationMethod = 'fis_competition_year' | 'calendar_age'

export type AgeCategory = {
  name: string       // e.g. "U16"
  minAge: number     // inclusive
  maxAge: number     // inclusive (use 999 for open/no upper bound)
}

/** FIS / US Ski & Snowboard default categories */
export const FIS_DEFAULT_CATEGORIES: AgeCategory[] = [
  { name: 'U8',     minAge: 0,  maxAge: 7  },
  { name: 'U10',    minAge: 8,  maxAge: 9  },
  { name: 'U12',    minAge: 10, maxAge: 11 },
  { name: 'U14',    minAge: 12, maxAge: 13 },
  { name: 'U16',    minAge: 14, maxAge: 15 },
  { name: 'U18',    minAge: 16, maxAge: 17 },
  { name: 'U21',    minAge: 18, maxAge: 20 },
  { name: 'Senior', minAge: 21, maxAge: 999 },
]

/**
 * Returns the competition season end year for the current date.
 * North American alpine ski season runs ~Oct–Apr.
 * October onward = new season has started → end year is next calendar year.
 */
export function currentSeasonEndYear(date: Date = new Date()): number {
  return date.getMonth() >= 9 ? date.getFullYear() + 1 : date.getFullYear()
}

/**
 * Calculate competition age using FIS method:
 *   competition age = season end year − birth year
 */
export function fisCompetitionAge(dateOfBirth: string, seasonEndYear?: number): number {
  const year = seasonEndYear ?? currentSeasonEndYear()
  const birthYear = new Date(dateOfBirth).getFullYear()
  return year - birthYear
}

/**
 * Calculate actual calendar age from date of birth.
 */
export function calendarAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--
  return age
}

/**
 * Get the category name for a given competition age.
 */
export function getCategoryName(
  age: number,
  categories: AgeCategory[] = FIS_DEFAULT_CATEGORIES
): string {
  const match = categories.find((c) => age >= c.minAge && age <= c.maxAge)
  return match?.name ?? 'Senior'
}

/**
 * All-in-one: given a DOB and club settings, return { age, category }.
 */
export function getAthleteCategory(
  dateOfBirth: string,
  method: AgeCalculationMethod = 'fis_competition_year',
  categories: AgeCategory[] = FIS_DEFAULT_CATEGORIES,
  seasonEndYear?: number
): { age: number; category: string } {
  const age =
    method === 'fis_competition_year'
      ? fisCompetitionAge(dateOfBirth, seasonEndYear)
      : calendarAge(dateOfBirth)
  return { age, category: getCategoryName(age, categories) }
}

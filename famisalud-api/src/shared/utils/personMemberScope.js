/**
 * SQL predicate that matches a resource assigned to any family profile of the
 * same global person as the requested profile. The arguments are trusted SQL
 * identifiers/placeholders authored by the repository, never request input.
 */
export function personMemberScope(memberColumn, memberIdPlaceholder) {
  return `${memberColumn} IN (
    SELECT related_profile.id
    FROM family_members related_profile
    JOIN family_members requested_profile
      ON requested_profile.person_id = related_profile.person_id
    WHERE requested_profile.id = ${memberIdPlaceholder}
  )`;
}

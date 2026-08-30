export const LIFE_SKILLS = [
  'Be patient when others take time to learn.',
  'Kindness is a superpower everyone can use.',
  'Always listen carefully before you speak.',
  'Making mistakes is the first step in learning.',
  'Share your toys, books, and smiles with friends.',
  'Keep your study desk neat and tidy every day.',
  'Help your parents with small chores at home.',
  'Always tell the truth, even when it is hard.',
  'Believe in yourself; you can do amazing things!'
]

/** Picks a skill that is not the one already on screen. */
export function randomLifeSkill(current?: string): string {
  const pool = LIFE_SKILLS.filter((s) => s !== current)
  return pool[Math.floor(Math.random() * pool.length)]
}

export interface VocabularyEntry {
  word: string
  syn: string
  meaning: string
}

export const VOCABULARY_LIST: VocabularyEntry[] = [
  { word: 'Dream', syn: 'Wish', meaning: 'Something you hope will happen one day.' },
  { word: 'Brave', syn: 'Courageous', meaning: 'Ready to do something even when it feels scary.' },
  { word: 'Joyful', syn: 'Happy', meaning: 'Full of happiness.' },
  { word: 'Neat', syn: 'Tidy', meaning: 'Clean and arranged in order.' },
  { word: 'Huge', syn: 'Enormous', meaning: 'Very, very big.' },
  { word: 'Smart', syn: 'Intelligent', meaning: 'Quick to learn and understand.' },
  { word: 'Polite', syn: 'Courteous', meaning: 'Speaking and behaving kindly to others.' },
  { word: 'Quick', syn: 'Swift', meaning: 'Moving or happening very fast.' },
  { word: 'Calm', syn: 'Peaceful', meaning: 'Quiet and free from worry.' },
  { word: 'Helpful', syn: 'Supportive', meaning: 'Ready to help other people.' }
]

export function randomVocabulary(current?: string): VocabularyEntry {
  const pool = VOCABULARY_LIST.filter((v) => v.word !== current)
  return pool[Math.floor(Math.random() * pool.length)]
}

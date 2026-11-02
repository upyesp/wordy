export type WordStatus = 'new' | 'dup' | 'invalid' | 'short';

export interface Submission {
  status: WordStatus;
  points: number;
}

/**
 * Session scoring: valid words score 10·(length−2)² points once each; the best
 * session score persists across visits (feedback round; minimum 3 letters).
 */
export class Score {
  score = 0;
  words = 0;
  best = 0;
  private readonly found = new Set<string>();

  constructor(private readonly dictionary: Set<string>) {
    try {
      this.best = Number(localStorage.getItem('wordy.best') ?? 0) || 0;
    } catch {
      this.best = 0;
    }
  }

  submit(word: string): Submission {
    if (word.length < 3) return { status: 'short', points: 0 };
    const w = word.toLowerCase();
    if (!this.dictionary.has(w)) return { status: 'invalid', points: 0 };
    if (this.found.has(w)) return { status: 'dup', points: 0 };
    this.found.add(w);
    const points = 10 * (word.length - 2) ** 2;
    this.score += points;
    this.words += 1;
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem('wordy.best', String(this.best));
      } catch {
        /* private mode: best stays in-memory */
      }
    }
    return { status: 'new', points };
  }
}

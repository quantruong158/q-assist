import { signal } from '@angular/core';

const DEFAULT_PACE_MS = 12;
const DEFAULT_MAX_CHUNK_SIZE = 28;
const COMPACT_QUEUE_THRESHOLD = 64;

const PACING_BOUNDARY_CHARS = new Set([
  ' ',
  '\t',
  '\n',
  '\r',
  '.',
  ',',
  '!',
  '?',
  ';',
  ':',
  ')',
  ']',
  '}',
]);

export interface StreamingTextPacerOptions {
  paceMs?: number;
  maxChunkSize?: number;
}

export function splitPacedChunks(delta: string, maxChunkSize = DEFAULT_MAX_CHUNK_SIZE): string[] {
  if (!delta) {
    return [];
  }

  const chunkLimit = Math.max(1, maxChunkSize);
  const chunks: string[] = [];
  let chunkStart = 0;

  for (let index = 0; index < delta.length; index++) {
    const chunkLength = index - chunkStart + 1;
    if (chunkLength < chunkLimit && !PACING_BOUNDARY_CHARS.has(delta[index])) {
      continue;
    }

    chunks.push(delta.slice(chunkStart, index + 1));
    chunkStart = index + 1;
  }

  if (chunkStart < delta.length) {
    chunks.push(delta.slice(chunkStart));
  }

  return chunks;
}

export class StreamingTextPacer {
  readonly revealedText = signal('');

  private readonly paceMs: number;
  private readonly maxChunkSize: number;
  private pendingChunks: string[] = [];
  private pendingChunkIndex = 0;
  private lastRawText = '';
  private wasStreaming = false;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor(options: StreamingTextPacerOptions = {}) {
    this.paceMs = options.paceMs ?? DEFAULT_PACE_MS;
    this.maxChunkSize = options.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  }

  sync(rawText: string, isStreaming: boolean): void {
    if (!isStreaming) {
      this.reset();
      this.lastRawText = rawText;
      this.revealedText.set(rawText);
      return;
    }

    if (!this.wasStreaming) {
      this.reset();
      this.wasStreaming = true;
      this.lastRawText = '';
      this.revealedText.set('');

      if (rawText.length > 0) {
        this.lastRawText = rawText;
        this.enqueueDelta(rawText);
      }

      return;
    }

    if (rawText === this.lastRawText) {
      return;
    }

    if (rawText.length < this.lastRawText.length || !rawText.startsWith(this.lastRawText)) {
      this.stopTimer();
      this.clearPendingChunks();
      this.lastRawText = rawText;
      this.revealedText.set(rawText);
      return;
    }

    const delta = rawText.slice(this.lastRawText.length);
    this.lastRawText = rawText;

    if (delta) {
      this.enqueueDelta(delta);
    }
  }

  destroy(): void {
    this.reset();
  }

  private enqueueDelta(delta: string): void {
    this.pendingChunks.push(...splitPacedChunks(delta, this.maxChunkSize));

    if (this.timerId === null) {
      this.revealNextChunk();
    }
  }

  private revealNextChunk(): void {
    if (this.timerId !== null || this.getPendingChunkCount() === 0) {
      return;
    }

    const nextChunk = this.dequeueChunk();
    if (!nextChunk) {
      return;
    }

    this.revealedText.update((current) => current + nextChunk);

    if (this.getPendingChunkCount() > 0) {
      this.scheduleNextChunk();
    }
  }

  private scheduleNextChunk(): void {
    if (this.timerId !== null || this.getPendingChunkCount() === 0) {
      return;
    }

    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.revealNextChunk();
    }, this.paceMs);
  }

  private stopTimer(): void {
    if (this.timerId === null) {
      return;
    }

    clearTimeout(this.timerId);
    this.timerId = null;
  }

  private dequeueChunk(): string | undefined {
    if (this.pendingChunkIndex >= this.pendingChunks.length) {
      return undefined;
    }

    const nextChunk = this.pendingChunks[this.pendingChunkIndex];
    this.pendingChunkIndex += 1;
    this.compactPendingChunks();
    return nextChunk;
  }

  private getPendingChunkCount(): number {
    return this.pendingChunks.length - this.pendingChunkIndex;
  }

  private compactPendingChunks(): void {
    if (this.pendingChunkIndex === 0) {
      return;
    }

    if (this.pendingChunkIndex >= this.pendingChunks.length) {
      this.clearPendingChunks();
      return;
    }

    if (
      this.pendingChunkIndex < COMPACT_QUEUE_THRESHOLD ||
      this.pendingChunkIndex * 2 < this.pendingChunks.length
    ) {
      return;
    }

    this.pendingChunks = this.pendingChunks.slice(this.pendingChunkIndex);
    this.pendingChunkIndex = 0;
  }

  private clearPendingChunks(): void {
    this.pendingChunks = [];
    this.pendingChunkIndex = 0;
  }

  private reset(): void {
    this.stopTimer();
    this.clearPendingChunks();
    this.wasStreaming = false;
  }
}

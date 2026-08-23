export interface LockSnapshot {
  readonly lockedBy: string | null;
  readonly lockedAt: Date | null;
  readonly expiresAt: Date | null;
}

export function isLockActive(lock: LockSnapshot, now = new Date()): boolean {
  return Boolean(lock.lockedBy && lock.expiresAt && lock.expiresAt.getTime() > now.getTime());
}

export function canAcquireLock(lock: LockSnapshot, userId: string, now = new Date()): boolean {
  return !isLockActive(lock, now) || lock.lockedBy === userId;
}

export interface RevisionIdentity {
  readonly revisionId: string;
  readonly postId: string;
}

export function assertRevisionBelongsToEntity(revision: RevisionIdentity, entityId: string): void {
  if (revision.postId !== entityId) throw new Error("Revision does not belong to the requested entity.");
}

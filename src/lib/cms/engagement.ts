export type ExclusiveTarget<T extends string> = Partial<Record<T, string | null>>;

export function assertExactlyOneTarget<T extends string>(
  targets: ExclusiveTarget<T>,
): void {
  const count = Object.values(targets).filter((value) => Boolean(value)).length;
  if (count !== 1) throw new Error("Exactly one target must be provided.");
}

export type NotificationTarget =
  | { kind: "post"; postId: string }
  | { kind: "comment"; commentId: string; postId: string }
  | { kind: "review"; reviewId: string; postId: string };

export function assertNotificationTarget(target: NotificationTarget): void {
  if (target.kind === "post" && !target.postId) throw new Error("Post notification requires a postId.");
  if (target.kind === "comment" && (!target.commentId || !target.postId)) throw new Error("Comment notification requires commentId and postId.");
  if (target.kind === "review" && (!target.reviewId || !target.postId)) throw new Error("Review notification requires reviewId and postId.");
}

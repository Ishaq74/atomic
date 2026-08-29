export type NotificationTarget =
  | { readonly postId: string; readonly commentId?: never; readonly reviewId?: never }
  | { readonly postId: string; readonly commentId: string; readonly reviewId?: never }
  | { readonly postId: string; readonly commentId?: never; readonly reviewId: string };

export interface NotificationContext extends NotificationTarget {
  readonly type: string;
}

export function assertNotificationContext(context: NotificationContext): void {
  if (!context.type.trim()) throw new Error("Notification type cannot be empty");
  if (!context.postId.trim()) throw new Error("Notification postId cannot be empty");
  if (context.commentId !== undefined && !context.commentId.trim()) throw new Error("Notification commentId cannot be empty");
  if (context.reviewId !== undefined && !context.reviewId.trim()) throw new Error("Notification reviewId cannot be empty");
}

import { assertTransition, canTransition, type WorkflowDefinition } from "@/lib/cms/workflow";
import { type BlogPostStatus } from "./constants";

export const blogPostWorkflow: WorkflowDefinition<BlogPostStatus> = {
  states: ["DRAFT", "PUBLISHED", "ARCHIVED", "DELETED"],
  transitions: [
    { from: "DRAFT", to: "PUBLISHED" },
    { from: "DRAFT", to: "ARCHIVED" },
    { from: "DRAFT", to: "DELETED" },
    { from: "PUBLISHED", to: "DRAFT" },
    { from: "PUBLISHED", to: "ARCHIVED" },
    { from: "PUBLISHED", to: "DELETED" },
    { from: "ARCHIVED", to: "DRAFT" },
    { from: "ARCHIVED", to: "DELETED" },
    { from: "DELETED", to: "DRAFT" },
  ],
};

export function canTransitionBlogPost(from: BlogPostStatus, to: BlogPostStatus): boolean {
  return canTransition(blogPostWorkflow, from, to);
}

export function assertBlogPostTransition(from: BlogPostStatus, to: BlogPostStatus): void {
  assertTransition(blogPostWorkflow, from, to);
}

import { assertTransition, canTransition, type WorkflowDefinition } from "@/core/workflow";
import type { ServiceStatus } from "./domain";
import { SERVICE_STATUSES } from "./domain";

export const SERVICE_WORKFLOW: WorkflowDefinition<ServiceStatus> = {
  states: SERVICE_STATUSES,
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

export const canTransitionService = (from: ServiceStatus, to: ServiceStatus) => from === to || canTransition(SERVICE_WORKFLOW, from, to);
export const assertValidServiceTransition = (from: ServiceStatus, to: ServiceStatus) => {
  if (from === to) return;
  assertTransition(SERVICE_WORKFLOW, from, to);
};

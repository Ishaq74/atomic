import { createAuthClient } from "better-auth/client";
import { usernameClient, adminClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient(),
    organizationClient(),
  ],
});

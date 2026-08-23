import { registerModule } from "./module-registry";
import { blogModule } from "@/lib/blog/module";

let bootstrapped = false;

export function bootstrapModules(): void {
  if (bootstrapped) return;
  registerModule(blogModule);
  bootstrapped = true;
}

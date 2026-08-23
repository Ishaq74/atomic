import { registerModule } from "./module-registry";
import { blogModule } from "@/modules/blog/module";

let bootstrapped = false;

export function bootstrapModules(): void {
  if (bootstrapped) return;
  registerModule(blogModule);
  bootstrapped = true;
}

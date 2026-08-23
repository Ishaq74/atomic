import { registerModule } from "./module-registry";
import { blogModule } from "@/modules/blog/module";
import { servicesModule } from "@/modules/services/module";

let bootstrapped = false;

export function bootstrapModules(): void {
  if (bootstrapped) return;
  registerModule(blogModule);
  registerModule(servicesModule);
  bootstrapped = true;
}

import { registerModule } from "./module-registry";
import { blogModule } from "@/modules/blog/module";
import { servicesModule } from "@/modules/services/module";
import { blogSearchDefinition } from "@/modules/blog/search";
import { servicesSearchDefinition } from "@/modules/services/search";
import { registerSearchResource } from "@/core/search";
import { registerInternalLinkResolver } from "@/lib/content/internal-link-resolver";
import { blogInternalLinkResolver } from "@/lib/blog/blog-internal-link";
import { serviceInternalLinkResolver } from "@/lib/services/services-internal-link";

let bootstrapped = false;

export function bootstrapModules(): void {
  if (bootstrapped) return;
  registerModule(blogModule);
  registerModule(servicesModule);
  registerSearchResource(blogSearchDefinition);
  registerSearchResource(servicesSearchDefinition);
  registerInternalLinkResolver(blogInternalLinkResolver);
  registerInternalLinkResolver(serviceInternalLinkResolver);
  bootstrapped = true;
}

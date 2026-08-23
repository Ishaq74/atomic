import { assertResourceCompatibility, type AdminResourceDefinition } from "@/lib/cms/resource-contract";
import { blogModule } from "@/modules/blog/module";

export const blogPostAdminResource: AdminResourceDefinition = {
  id: "blog-post",
  entity: "blog_post",
  management: {
    list: true,
    search: true,
    filters: true,
    sort: true,
    pagination: true,
    stats: true,
  },
  actions: {
    create: true,
    read: true,
    update: true,
    duplicate: true,
    publish: true,
    unpublish: true,
    archive: true,
    restore: true,
    delete: true,
    bulk: false,
  },
  presentation: {
    card: ["default", "compact"],
    list: ["default", "dense"],
    single: ["default"],
  },
  permissionNamespace: "blog",
};

assertResourceCompatibility(blogModule, blogPostAdminResource);

import { describe, expect, it } from "vitest";
import { blogModule } from "@/lib/blog/module";
import { blogPostAdminResource } from "@/lib/blog/admin-resource";

describe("Atomic module contracts", () => {
  it("registers Blog with the expected platform capabilities", () => {
    expect(blogModule.id).toBe("blog");
    expect(blogModule.entity).toBe("blog_post");
    expect(blogModule.capabilities).toEqual({
      localization: true,
      media: true,
      seo: true,
      taxonomy: true,
      search: true,
      publication: true,
      revisions: true,
      locks: true,
      moderation: true,
      notifications: true,
      audit: true,
    });
  });

  it("declares Blog's editorial resource actions and presentation grammar", () => {
    expect(blogPostAdminResource.id).toBe("blog-post");
    expect(blogPostAdminResource.actions.create).toBe(true);
    expect(blogPostAdminResource.actions.publish).toBe(true);
    expect(blogPostAdminResource.actions.duplicate).toBe(true);
    expect(blogPostAdminResource.actions.delete).toBe(true);
    expect(blogPostAdminResource.presentation).toEqual({
      card: ["default", "compact"],
      list: ["default", "dense"],
      single: ["default"],
    });
  });
});

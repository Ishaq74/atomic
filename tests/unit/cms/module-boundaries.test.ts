import { describe, expect, it } from "vitest";
import { blogModule, blogPostAdminResource, blogSearchDefinition } from "@/modules/blog";
import { assertSearchResourceDefinition } from "@/core/search";

describe("Blog module boundaries", () => {
  it("declares the shared CMS capabilities and presentation grammar", () => {
    expect(blogModule.capabilities).toMatchObject({
      content: true,
      localization: true,
      media: true,
      seo: true,
      taxonomy: true,
      search: true,
      publication: true,
      revisions: true,
      locks: true,
      engagement: true,
      moderation: true,
      notifications: true,
      audit: true,
      cache: true,
    });
    expect(blogModule.presentations.card).toEqual(["default", "compact", "featured"]);
    expect(blogModule.presentations.list).toContain("search");
    expect(blogModule.presentations.single).toContain("reader");
  });

  it("exposes typed admin and search boundaries", () => {
    expect(blogPostAdminResource.management).toEqual({
      list: true,
      search: true,
      filters: true,
      sort: true,
      pagination: true,
      stats: true,
    });
    expect(blogPostAdminResource.list?.filters?.map((filter) => filter.id)).toEqual([
      "search",
      "status",
      "category",
      "tag",
      "author",
      "featured",
      "sticky",
      "locale",
    ]);
    expect(blogSearchDefinition.resourceId).toBe("blog-post");
    expect(() => assertSearchResourceDefinition(blogSearchDefinition)).not.toThrow();
  });
});

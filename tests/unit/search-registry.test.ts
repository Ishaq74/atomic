import { beforeEach, describe, expect, it } from "vitest";
import { blogSearchDefinition } from "@/modules/blog/search";
import { servicesSearchDefinition } from "@/modules/services/search";
import { getSearchResource, listSearchResources, registerSearchResource, resetSearchRegistryForTests } from "@/core/search";

describe("CMS search registry", () => {
  beforeEach(() => resetSearchRegistryForTests());

  it("registers and retrieves a resource by stable identifier", () => {
    registerSearchResource(blogSearchDefinition);
    expect(getSearchResource("blog-post")).toEqual(blogSearchDefinition);
  });

  it("rejects duplicate resource identifiers", () => {
    registerSearchResource(blogSearchDefinition);
    expect(() => registerSearchResource({ ...blogSearchDefinition })).toThrow(/already registered/i);
  });

  it("keeps Blog and Services adapters independently registered", () => {
    registerSearchResource(blogSearchDefinition);
    registerSearchResource(servicesSearchDefinition);
    expect(listSearchResources().map((item) => item.resourceId)).toEqual(["blog-post", "service"]);
  });
});

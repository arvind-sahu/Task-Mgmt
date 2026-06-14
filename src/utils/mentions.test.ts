import { describe, expect, it } from "vitest";

import {
  extractMentionedUserIds,
  filterMentionUsers,
  mentionDisplayLabel,
  richTextPlainPreview,
} from "./mentions";

describe("mentions", () => {
  it("extracts user ids from mention spans", () => {
    const html =
      '<p>Hi <span data-type="mention" data-id="user1" data-label="Arvind" class="rich-text-mention">@Arvind</span></p>';
    expect(extractMentionedUserIds(html)).toEqual(["user1"]);
  });

  it("filters users by name or email prefix", () => {
    const users = [
      { id: "1", name: "Arvind Sahu", email: "arvind@taskers.in" },
      { id: "2", name: "Jane Doe", email: "jane@taskers.in" },
    ];
    expect(filterMentionUsers(users, "arv").map((u) => u.id)).toEqual(["1"]);
    expect(filterMentionUsers(users, "jane").map((u) => u.id)).toEqual(["2"]);
  });

  it("builds display labels", () => {
    expect(
      mentionDisplayLabel({
        id: "1",
        name: "Arvind",
        email: "arvind@taskers.in",
      }),
    ).toBe("Arvind");
    expect(
      mentionDisplayLabel({
        id: "1",
        name: null,
        email: "arvind@taskers.in",
      }),
    ).toBe("arvind");
  });

  it("strips html for previews", () => {
    expect(richTextPlainPreview("<p>Hello <strong>team</strong></p>")).toBe(
      "Hello team",
    );
  });
});

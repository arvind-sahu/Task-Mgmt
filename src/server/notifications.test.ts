import { describe, expect, it, vi } from "vitest";
import { NotificationType } from "@prisma/client";

import { createNotification, notifyUsers } from "./notifications";

describe("notifications", () => {
  it("createNotification persists a row", async () => {
    const create = vi.fn().mockResolvedValue({ id: "n1" });
    const db = { notification: { create } };

    await createNotification(db, {
      userId: "u1",
      type: NotificationType.TASK_ASSIGNED,
      title: "Assigned",
      message: "Do the thing",
      link: "/tasks/t1",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        type: NotificationType.TASK_ASSIGNED,
        title: "Assigned",
      }),
    });
  });

  it("notifyUsers deduplicates recipient ids", async () => {
    const create = vi.fn().mockResolvedValue({ id: "n1" });
    const db = { notification: { create } };

    await notifyUsers(db, ["u1", "u1", "u2"], {
      type: NotificationType.TASK_COMMENT,
      title: "Comment",
      message: "Hi",
    });

    expect(create).toHaveBeenCalledTimes(2);
  });
});

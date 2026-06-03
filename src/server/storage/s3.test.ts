import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  buildObjectUrl,
  extractKeyFromObjectUrl,
  isAllowedTaskAttachmentKey,
  isAllowedUserImageKey,
  isTaskAttachmentKeyForUser,
  isUserImageKeyForUser,
  resolveLegacyUserImageKey,
  taskAttachmentKey,
  userImageKey,
} from "~/server/storage/s3";

describe("s3 storage helpers", () => {
  beforeEach(() => {
    process.env.AWS_S3_BUCKET_NAME = "tasker-prod-s3";
    process.env.AWS_S3_REGION = "ap-south-1";
  });

  afterEach(() => {
    delete process.env.AWS_S3_BUCKET_NAME;
    delete process.env.AWS_S3_REGION;
  });

  it("builds predictable object keys scoped to the user", () => {
    expect(userImageKey("user_1", "image/png")).toMatch(
      /^user-images\/user_1\/\d+\.png$/,
    );
    expect(taskAttachmentKey("user_1", "spec.pdf")).toMatch(
      /^tasks-attachments\/user_1\/\d+-spec\.pdf$/,
    );
    expect(isUserImageKeyForUser("user-images/user_1/1.jpg", "user_1")).toBe(
      true,
    );
    expect(isTaskAttachmentKeyForUser("tasks-attachments/user_1/x.pdf", "user_1")).toBe(
      true,
    );
  });

  it("validates bucket object URLs and resolves legacy user keys", () => {
    const userUrl = buildObjectUrl("user-images/u1/photo.jpg");
    const taskUrl = buildObjectUrl("tasks-attachments/u1/file.pdf");

    expect(isAllowedUserImageKey("user-images/u1/photo.jpg")).toBe(true);
    expect(isAllowedTaskAttachmentKey("tasks-attachments/u1/file.pdf")).toBe(true);
    expect(extractKeyFromObjectUrl(userUrl)).toBe("user-images/u1/photo.jpg");

    expect(
      resolveLegacyUserImageKey({
        imageKey: "user-images/u1/new.jpg",
        image: userUrl,
      }),
    ).toBe("user-images/u1/new.jpg");

    expect(resolveLegacyUserImageKey({ image: userUrl })).toBe(
      "user-images/u1/photo.jpg",
    );
    expect(resolveLegacyUserImageKey({ image: taskUrl })).toBeNull();
  });
});

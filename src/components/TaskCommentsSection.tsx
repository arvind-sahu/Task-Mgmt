import { useState, type FormEvent } from "react";

import { AttachmentList, type AttachmentItem } from "~/components/AttachmentList";
import { FileUploadButton } from "~/components/FileUploadButton";
import { api, type RouterOutputs } from "~/utils/api";
import { formatDateTime, wasEdited } from "~/utils/date";

type TaskComment = RouterOutputs["task"]["byId"]["comments"][number];

type TaskCommentsSectionProps = {
  taskId: string;
  comments: TaskComment[];
};

function normalizeAttachments(
  attachments: Array<{
    id?: string;
    fileName?: string;
    mimeType?: string;
    dataUrl?: string | null;
    storageKey?: string | null;
  }>,
): AttachmentItem[] {
  return attachments.filter(
    (
      att,
    ): att is AttachmentItem =>
      Boolean(att.id) &&
      Boolean(att.fileName) &&
      Boolean(att.mimeType) &&
      Boolean(att.storageKey ?? att.dataUrl),
  );
}

export function TaskCommentsSection({
  taskId,
  comments,
}: TaskCommentsSectionProps) {
  const utils = api.useUtils();
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

  const refreshTaskCaches = () => {
    void utils.task.byId.invalidate({ id: taskId });
    void utils.task.list.invalidate();
    void utils.task.myTasks.invalidate();
    void utils.task.myUpcoming.invalidate();
  };

  const addComment = api.comment.create.useMutation({
    onSuccess: () => {
      refreshTaskCaches();
      setComment("");
    },
  });
  const delComment = api.comment.delete.useMutation({
    onSuccess: refreshTaskCaches,
  });
  const updateComment = api.comment.update.useMutation({
    onSuccess: () => {
      refreshTaskCaches();
      setEditingCommentId(null);
      setEditingCommentBody("");
    },
  });
  const addCommentAttachment = api.attachment.createForComment.useMutation({
    onSuccess: refreshTaskCaches,
  });
  const requestAttachmentUploadUrl = api.attachment.getUploadUrl.useMutation();
  const delAttachment = api.attachment.delete.useMutation({
    onSuccess: refreshTaskCaches,
  });

  const deletingAttachmentId =
    delAttachment.variables && typeof delAttachment.variables === "object"
      ? delAttachment.variables.id
      : null;

  function handleAddComment(e: FormEvent) {
    e.preventDefault();
    addComment.mutate({ taskId, body: comment });
  }

  return (
    <div className="card mt-4">
      <h2 className="mb-4 text-base font-semibold text-heading">
        Comments ({comments.length})
      </h2>
      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <span className="app-avatar grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold">
              {(c.author.name ?? c.author.email).charAt(0).toUpperCase()}
            </span>
            <div className="comment-bubble min-w-0 flex-1 rounded-md p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-heading">
                  {c.author.name ?? c.author.email}
                </p>
                <div className="text-right text-xs text-muted">
                  <p>{formatDateTime(c.createdAt)}</p>
                  {wasEdited(c.createdAt, c.updatedAt) && (
                    <p className="opacity-70">
                      Edited {formatDateTime(c.updatedAt)}
                    </p>
                  )}
                </div>
              </div>

              {editingCommentId === c.id ? (
                <form
                  className="mt-2 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateComment.mutate({
                      id: c.id,
                      body: editingCommentBody,
                    });
                  }}
                >
                  <textarea
                    className="input"
                    rows={3}
                    value={editingCommentBody}
                    onChange={(e) => setEditingCommentBody(e.target.value)}
                    required
                    maxLength={2000}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={updateComment.isPending}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditingCommentBody("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm text-heading">
                  {c.body}
                </p>
              )}

              <AttachmentList
                items={normalizeAttachments(c.attachments)}
                onDelete={(attId) => delAttachment.mutate({ id: attId })}
                deletingId={delAttachment.isPending ? deletingAttachmentId : null}
              />

              {editingCommentId !== c.id && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <FileUploadButton
                    label="Attach file"
                    disabled={addCommentAttachment.isPending}
                    requestUploadUrl={(input) =>
                      requestAttachmentUploadUrl.mutateAsync(input)
                    }
                    onUploaded={async (file) => {
                      await addCommentAttachment.mutateAsync({
                        commentId: c.id,
                        fileName: file.fileName,
                        mimeType: file.mimeType,
                        storageKey: file.storageKey,
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="link-accent text-xs hover:underline"
                    onClick={() => {
                      setEditingCommentId(c.id);
                      setEditingCommentBody(c.body);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs hover:underline"
                    style={{ color: "var(--danger-text)" }}
                    onClick={() => delComment.mutate({ id: c.id })}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="text-sm italic text-muted">
            No comments yet — start the discussion.
          </li>
        )}
      </ul>

      <form onSubmit={handleAddComment} className="mt-6 space-y-2">
        <textarea
          className="input"
          rows={3}
          placeholder="Add a comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          maxLength={2000}
        />
        <p className="text-xs text-muted">
          You can attach images or PDFs to comments after posting.
        </p>
        <div className="flex justify-end">
          <button className="btn-primary" disabled={addComment.isPending}>
            {addComment.isPending ? "Posting…" : "Post comment"}
          </button>
        </div>
      </form>
    </div>
  );
}

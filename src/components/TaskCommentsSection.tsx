import { useState, type FormEvent } from "react";

import { AttachmentList, type AttachmentItem } from "~/components/AttachmentList";
import { FileUploadButton } from "~/components/FileUploadButton";
import {
  RichTextContent,
  RichTextEditor,
} from "~/components/rich-text";
import {
  useRichTextImageUpload,
} from "~/components/rich-text/useRichTextImageUpload";
import { canModifyTaskComment } from "~/utils/commentPermissions";
import { hasRichTextContent } from "~/utils/richText";
import { api, type RouterOutputs } from "~/utils/api";
import { formatDateTime, wasEdited } from "~/utils/date";

type TaskComment = RouterOutputs["task"]["byId"]["comments"][number];

type TaskCommentsSectionProps = {
  taskId: string;
  comments: TaskComment[];
  isProjectOwner?: boolean;
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
  isProjectOwner = false,
}: TaskCommentsSectionProps) {
  const utils = api.useUtils();
  const me = api.user.me.useQuery();
  const workspace = api.company.workspaceContext.useQuery();
  const { uploadImage } = useRichTextImageUpload();
  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<
    string | null
  >(null);

  const currentUserId = me.data?.id;
  const companyRole = workspace.data?.role;

  function userCanModifyComment(commentAuthorId: string) {
    return canModifyTaskComment(commentAuthorId, currentUserId, {
      isProjectOwner,
      companyRole,
    });
  }

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
    onSuccess: () => {
      setPendingDeleteCommentId(null);
      refreshTaskCaches();
    },
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
    if (!hasRichTextContent(comment)) return;
    addComment.mutate({ taskId, body: comment });
  }

  return (
    <div className="card mt-4">
      <h2 className="mb-4 text-base font-semibold text-heading">
        Comments ({comments.length})
      </h2>
      <ul className="space-y-4">
        {comments.map((c) => {
          const canModify = userCanModifyComment(c.author.id);
          return (
          <li key={c.id} className="flex gap-3">
            <span className="app-avatar grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold">
              {(c.author.name ?? c.author.email).charAt(0).toUpperCase()}
            </span>
            <div className="comment-bubble min-w-0 flex-1 rounded-md p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="text-sm font-medium text-heading">
                  {c.author.name ?? c.author.email}
                </p>
                <span className="text-xs text-muted">
                  {formatDateTime(c.createdAt)}
                </span>
                {wasEdited(c.createdAt, c.updatedAt) && (
                  <span className="text-xs text-muted opacity-70">
                    Edited {formatDateTime(c.updatedAt)}
                  </span>
                )}
              </div>

              {editingCommentId === c.id ? (
                <form
                  className="mt-2 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!hasRichTextContent(editingCommentBody)) return;
                    updateComment.mutate({
                      id: c.id,
                      body: editingCommentBody,
                    });
                  }}
                >
                  <RichTextEditor
                    value={editingCommentBody}
                    onChange={setEditingCommentBody}
                    placeholder="Edit comment…"
                    minHeightClassName="min-h-[5rem]"
                    uploadImage={uploadImage}
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
                <div className="mt-1">
                  <RichTextContent html={c.body} />
                </div>
              )}

              <AttachmentList
                items={normalizeAttachments(c.attachments)}
                onDelete={(attId) => delAttachment.mutate({ id: attId })}
                deletingId={delAttachment.isPending ? deletingAttachmentId : null}
              />

              {editingCommentId !== c.id && canModify && (
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
                      setPendingDeleteCommentId(null);
                      setEditingCommentId(c.id);
                      setEditingCommentBody(c.body);
                    }}
                  >
                    Edit
                  </button>
                  {pendingDeleteCommentId === c.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted">
                        Delete this comment permanently?
                      </span>
                      <button
                        type="button"
                        className="text-xs font-semibold hover:underline"
                        style={{ color: "var(--danger-text)" }}
                        disabled={delComment.isPending}
                        onClick={() => delComment.mutate({ id: c.id })}
                      >
                        {delComment.isPending ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-muted hover:underline"
                        onClick={() => setPendingDeleteCommentId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs hover:underline"
                      style={{ color: "var(--danger-text)" }}
                      onClick={() => {
                        setEditingCommentId(null);
                        setPendingDeleteCommentId(c.id);
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
          );
        })}
        {comments.length === 0 && (
          <li className="text-sm italic text-muted">
            No comments yet — start the discussion.
          </li>
        )}
      </ul>

      <form onSubmit={handleAddComment} className="mt-6 space-y-2">
        <RichTextEditor
          value={comment}
          onChange={setComment}
          placeholder="Add a comment…"
          minHeightClassName="min-h-[5rem]"
          uploadImage={uploadImage}
        />
        <p className="text-xs text-muted">
          Paste screenshots, drag images in, or use the Image button. Format text
          with the toolbar like a doc.
        </p>
        <div className="flex justify-end">
          <button
            className="btn-primary"
            disabled={addComment.isPending || !hasRichTextContent(comment)}
          >
            {addComment.isPending ? "Posting…" : "Post comment"}
          </button>
        </div>
      </form>
    </div>
  );
}

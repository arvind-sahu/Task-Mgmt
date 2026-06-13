import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { buildRichTextExtensions } from "~/components/rich-text/editorExtensions";
import { hydrateRichTextHtml } from "~/components/rich-text/hydrateRichTextHtml";
import { api } from "~/utils/api";
import { isProbablyHtml } from "~/utils/richText";
import { requestObjectUrl } from "~/utils/objectUrls";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeightClassName?: string;
  uploadImage: (file: File) => Promise<{ storageKey: string; previewUrl: string }>;
};

function normalizeEditorHtml(value: string) {
  if (!value.trim()) return "";
  return isProbablyHtml(value) ? value : `<p>${value}</p>`;
}

function insertImageNode(
  editor: Editor,
  uploaded: { storageKey: string; previewUrl: string },
) {
  if (!uploaded.previewUrl) return;
  const attrs: Record<string, string | null> = {
    src: uploaded.previewUrl,
  };
  if (uploaded.storageKey) {
    attrs["data-storage-key"] = uploaded.storageKey;
  }
  editor.chain().focus().insertContent({ type: "image", attrs }).run();
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = "Write something…",
  minHeightClassName = "min-h-[6rem]",
  uploadImage,
}: RichTextEditorProps) {
  const utils = api.useUtils();
  const imageInputId = useId();
  const uploadImageRef = useRef(uploadImage);
  const editorRef = useRef<Editor | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);

  uploadImageRef.current = uploadImage;

  const resolveKey = (key: string) =>
    requestObjectUrl(key, (input) => utils.storage.getDownloadUrls.fetch(input));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: buildRichTextExtensions(placeholder),
    content: "",
    editorProps: {
      attributes: {
        class: `rich-text-editor ${minHeightClassName}`,
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (!item.type.startsWith("image/")) continue;
          const file = item.getAsFile();
          if (!file || !editorRef.current) continue;
          event.preventDefault();
          setUploadError(null);
          void uploadImageRef
            .current(file)
            .then((uploaded) => insertImageNode(editorRef.current!, uploaded))
            .catch((error: unknown) => {
              setUploadError(
                error instanceof Error ? error.message : "Image upload failed.",
              );
            });
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/") || !editorRef.current) {
          return false;
        }
        event.preventDefault();
        setUploadError(null);
        void uploadImageRef
          .current(file)
          .then((uploaded) => insertImageNode(editorRef.current!, uploaded))
          .catch((error: unknown) => {
            setUploadError(
              error instanceof Error ? error.message : "Image upload failed.",
            );
          });
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  editorRef.current = editor ?? null;

  useEffect(() => {
    if (!editor) return;
    let cancelled = false;

    const normalizedValue = normalizeEditorHtml(value);
    if (!normalizedValue.trim()) {
      if (editor.getHTML() !== "<p></p>") {
        editor.commands.setContent("<p></p>", { emitUpdate: false });
      }
      return;
    }

    const current = editor.getHTML();
    const needsImageHydration = /<img\b[^>]*data-storage-key/i.test(normalizedValue);

    if (!needsImageHydration && normalizedValue === current) {
      return;
    }

    setHydrating(needsImageHydration);
    void hydrateRichTextHtml(normalizedValue, resolveKey).then((hydrated) => {
      if (cancelled) return;
      if (hydrated !== editor.getHTML()) {
        editor.commands.setContent(hydrated || "<p></p>", { emitUpdate: false });
      }
      setHydrating(false);
    });

    return () => {
      cancelled = true;
    };
  }, [editor, value]);

  function applyBulletList(listStyleType: string) {
    if (!editor) return;
    if (editor.isActive("bulletList")) {
      editor
        .chain()
        .focus()
        .updateAttributes("bulletList", { listStyleType })
        .run();
      return;
    }
    editor
      .chain()
      .focus()
      .toggleBulletList()
      .updateAttributes("bulletList", { listStyleType })
      .run();
  }

  function applyOrderedList(listStyleType: string) {
    if (!editor) return;
    if (editor.isActive("orderedList")) {
      editor
        .chain()
        .focus()
        .updateAttributes("orderedList", { listStyleType })
        .run();
      return;
    }
    editor
      .chain()
      .focus()
      .toggleOrderedList()
      .updateAttributes("orderedList", { listStyleType })
      .run();
  }

  function handleImagePick(file: File) {
    if (!editor) return;
    setUploadError(null);
    void uploadImageRef
      .current(file)
      .then((uploaded) => insertImageNode(editor, uploaded))
      .catch((error: unknown) => {
        setUploadError(
          error instanceof Error ? error.message : "Image upload failed.",
        );
      });
  }

  if (!editor) return null;

  return (
    <div className="rich-text-shell rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <div
        className="rich-text-toolbar flex flex-wrap items-center gap-1 border-b px-2 py-1.5"
        style={{ borderColor: "var(--border-muted)" }}
      >
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[var(--border-muted)]" aria-hidden />
        <ToolbarButton
          label="Bulleted list"
          active={
            editor.isActive("bulletList") &&
            (editor.getAttributes("bulletList").listStyleType === "disc" ||
              !editor.getAttributes("bulletList").listStyleType)
          }
          onClick={() => applyBulletList("disc")}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          label="Hollow bullet list"
          active={editor.isActive("bulletList", { listStyleType: "circle" })}
          onClick={() => applyBulletList("circle")}
        >
          ◦
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList", { listStyleType: "decimal" })}
          onClick={() => applyOrderedList("decimal")}
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          label="Alphabetical list"
          active={editor.isActive("orderedList", { listStyleType: "lower-alpha" })}
          onClick={() => applyOrderedList("lower-alpha")}
        >
          a.
        </ToolbarButton>
        <ToolbarButton
          label="Roman list"
          active={editor.isActive("orderedList", { listStyleType: "lower-roman" })}
          onClick={() => applyOrderedList("lower-roman")}
        >
          i.
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[var(--border-muted)]" aria-hidden />
        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H
        </ToolbarButton>
        <button
          type="button"
          className="chip interactive-hover rounded-md px-2 py-1 text-xs font-semibold"
          onMouseDown={(event) => {
            event.preventDefault();
            document.getElementById(imageInputId)?.click();
          }}
        >
          Image
        </button>
        <input
          id={imageInputId}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) handleImagePick(file);
          }}
        />
      </div>
      {hydrating && (
        <p className="px-3 py-1 text-[11px] text-muted">Loading images…</p>
      )}
      {uploadError && (
        <p className="px-3 py-1 text-[11px]" style={{ color: "var(--danger-text)" }}>
          {uploadError}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  active,
  onClick,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? false}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
        active ? "chip-active" : "chip interactive-hover"
      }`}
    >
      {children}
    </button>
  );
}

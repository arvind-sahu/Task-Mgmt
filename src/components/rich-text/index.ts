import dynamic from "next/dynamic";

export { RichTextContent } from "./RichTextContent";
export { useRichTextImageUpload } from "./useRichTextImageUpload";

export const RichTextEditor = dynamic(
  () => import("./RichTextEditor").then((mod) => mod.RichTextEditor),
  { ssr: false },
);

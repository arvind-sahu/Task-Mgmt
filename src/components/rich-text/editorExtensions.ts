import BulletList from "@tiptap/extension-bullet-list";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import OrderedList from "@tiptap/extension-ordered-list";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

const LIST_STYLE_VALUES = new Set([
  "disc",
  "circle",
  "square",
  "decimal",
  "lower-alpha",
  "upper-alpha",
  "lower-roman",
  "upper-roman",
]);

const CustomBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "disc",
        parseHTML: (element) => {
          const attr = element.getAttribute("data-list-style");
          if (attr && LIST_STYLE_VALUES.has(attr)) return attr;
          const style = element.style.listStyleType;
          return style && LIST_STYLE_VALUES.has(style) ? style : "disc";
        },
        renderHTML: (attributes) => {
          const listStyleType = attributes.listStyleType ?? "disc";
          return {
            "data-list-style": listStyleType,
            style: `list-style-type: ${listStyleType}`,
          };
        },
      },
    };
  },
});

const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: "decimal",
        parseHTML: (element) => {
          const attr = element.getAttribute("data-list-style");
          if (attr && LIST_STYLE_VALUES.has(attr)) return attr;
          const style = element.style.listStyleType;
          return style && LIST_STYLE_VALUES.has(style) ? style : "decimal";
        },
        renderHTML: (attributes) => {
          const listStyleType = attributes.listStyleType ?? "decimal";
          return {
            "data-list-style": listStyleType,
            style: `list-style-type: ${listStyleType}`,
          };
        },
      },
    };
  },
});

const CustomImage = Image.configure({
  inline: false,
  allowBase64: true,
  HTMLAttributes: {
    class: "rich-text-image",
  },
}).extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-storage-key": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-storage-key"),
        renderHTML: (attributes) => {
          const key = attributes["data-storage-key"];
          if (!key) return {};
          return { "data-storage-key": key };
        },
      },
    };
  },
  parseHTML() {
    const rules = this.parent?.() ?? [];
    return [
      ...rules,
      {
        tag: "img[data-storage-key]",
      },
    ];
  },
});

export function buildRichTextExtensions(placeholder = "Write something…") {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      bulletList: false,
      orderedList: false,
      link: false,
    }),
    CustomBulletList,
    CustomOrderedList,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    CustomImage,
    Placeholder.configure({ placeholder }),
  ];
}

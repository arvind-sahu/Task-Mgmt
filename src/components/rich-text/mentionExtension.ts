import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";

import {
  MentionList,
  type MentionListHandle,
} from "~/components/rich-text/MentionList";
import {
  filterMentionUsers,
  mentionDisplayLabel,
  type MentionUser,
} from "~/utils/mentions";

function updateMentionPopupPosition(
  element: HTMLElement,
  clientRect?: (() => DOMRect | null) | null,
) {
  if (!clientRect) return;
  const rect = clientRect();
  if (!rect) return;
  element.style.position = "fixed";
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.bottom + 4}px`;
  element.style.zIndex = "200";
}

export function createMentionSuggestion(
  getUsers: () => MentionUser[],
): Omit<SuggestionOptions, "editor"> {
  return {
    char: "@",
    allowSpaces: false,
    items: ({ query }) => {
      return filterMentionUsers(getUsers(), query).map((user) => ({
        id: user.id,
        label: mentionDisplayLabel(user),
      }));
    },
    render: () => {
      let reactRenderer: ReactRenderer<MentionListHandle> | null = null;
      let element: HTMLElement | null = null;

      return {
        onStart: (props) => {
          reactRenderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });
          element = reactRenderer.element;
          element.style.position = "fixed";
          element.style.zIndex = "200";
          document.body.appendChild(element);
          updateMentionPopupPosition(element, props.clientRect);
        },
        onUpdate: (props) => {
          reactRenderer?.updateProps(props);
          if (element) updateMentionPopupPosition(element, props.clientRect);
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") return true;
          const ref = reactRenderer?.ref;
          if (!ref) return false;
          return ref.onKeyDown(
            props.event as unknown as import("react").KeyboardEvent,
          );
        },
        onExit: () => {
          if (element?.parentNode) {
            element.parentNode.removeChild(element);
          }
          reactRenderer?.destroy();
          reactRenderer = null;
          element = null;
        },
      };
    },
  };
}

export function buildMentionExtension(getUsers: () => MentionUser[]) {
  return Mention.configure({
    HTMLAttributes: {
      class: "rich-text-mention",
    },
    suggestion: createMentionSuggestion(getUsers),
  });
}

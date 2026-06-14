import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type KeyboardEvent,
} from "react";

export type MentionListItem = {
  id: string;
  label: string;
};

type MentionListProps = {
  items: MentionListItem[];
  command: (item: MentionListItem) => void;
};

export type MentionListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((index) =>
            items.length ? (index + items.length - 1) % items.length : 0,
          );
          return true;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((index) =>
            items.length ? (index + 1) % items.length : 0,
          );
          return true;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="mention-list rounded-lg border px-3 py-2 text-xs text-muted shadow-lg">
          No matching teammates
        </div>
      );
    }

    return (
      <div
        className="mention-list rounded-lg border py-1 shadow-lg"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`block w-full px-3 py-1.5 text-left text-sm ${
              index === selectedIndex ? "chip-active" : "interactive-hover"
            }`}
            onMouseEnter={() => setSelectedIndex(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              command(item);
            }}
          >
            @{item.label}
          </button>
        ))}
      </div>
    );
  },
);

import { useEffect, useMemo, useRef, useState } from "react";

import {
  AssigneeCluster,
  type AssigneeUser,
} from "~/components/AssigneeCluster";
import { CachedAvatar } from "~/components/CachedAvatar";
import { initialsFromName } from "~/utils/avatar";

const PREVIEW_COUNT = 2;

type AssigneePickerProps = {
  members: AssigneeUser[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  variant?: "form" | "compact";
};

function memberLabel(user: AssigneeUser) {
  return user.name ?? user.email;
}

function matchesQuery(user: AssigneeUser, query: string) {
  const haystack = `${user.name ?? ""} ${user.email}`.toLowerCase();
  return haystack.includes(query);
}

function AssigneeSearchPanel({
  members,
  selectedIds,
  search,
  onSearchChange,
  onToggleMember,
  onClose,
}: {
  members: AssigneeUser[];
  selectedIds: string[];
  search: string;
  onSearchChange: (value: string) => void;
  onToggleMember: (userId: string) => void;
  onClose: () => void;
}) {
  const filteredMembers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return members;
    return members.filter((member) => matchesQuery(member, normalized));
  }, [members, search]);

  return (
    <div className="surface-inset rounded-xl p-3 shadow-lg">
      <div className="mb-2 flex items-center gap-2">
        <label className="sr-only" htmlFor="assignee-picker-search">
          Search assignees
        </label>
        <input
          id="assignee-picker-search"
          className="input h-9 flex-1 text-sm"
          placeholder="Search by name or email…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          autoFocus
        />
        <button
          type="button"
          className="btn-ghost shrink-0 px-2 py-1 text-xs"
          onClick={onClose}
        >
          Done
        </button>
      </div>
      <div className="max-h-52 space-y-1 overflow-y-auto">
        {filteredMembers.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted">No users match your search.</p>
        ) : (
          filteredMembers.map((member) => {
            const selected = selectedIds.includes(member.id);
            const label = memberLabel(member);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggleMember(member.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition ${
                  selected ? "chip-active" : "interactive-hover"
                }`}
              >
                <span className="app-avatar grid h-7 w-7 place-items-center overflow-hidden rounded-full text-[10px] font-semibold">
                  <CachedAvatar
                    user={member}
                    alt={label}
                    className="h-full w-full object-cover"
                    fallback={initialsFromName(member.name, member.email)}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-heading">
                    {label}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {member.email}
                  </span>
                </span>
                {selected && (
                  <span className="text-xs font-semibold text-[var(--accent-muted-text)]">
                    Assigned
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function AssigneePicker({
  members,
  selectedIds,
  onChange,
  variant = "form",
}: AssigneePickerProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIds.includes(member.id)),
    [members, selectedIds],
  );

  const unselectedMembers = useMemo(
    () => members.filter((member) => !selectedIds.includes(member.id)),
    [members, selectedIds],
  );

  const previewMembers = unselectedMembers.slice(0, PREVIEW_COUNT);
  const hiddenCount = Math.max(0, unselectedMembers.length - previewMembers.length);

  useEffect(() => {
    if (!expanded || variant !== "compact") return;
    function onOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setExpanded(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onOutsideClick, true);
    return () => document.removeEventListener("mousedown", onOutsideClick, true);
  }, [expanded, variant]);

  function toggleMember(userId: string) {
    onChange(
      selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId],
    );
  }

  function closePicker() {
    setExpanded(false);
    setSearch("");
  }

  function renderMemberButton(
    user: AssigneeUser,
    selected: boolean,
    compact = false,
  ) {
    const label = memberLabel(user);
    return (
      <button
        key={user.id}
        type="button"
        onClick={() => toggleMember(user.id)}
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 ring-inset transition ${
          selected ? "chip-active" : "chip interactive-hover"
        } ${compact ? "text-xs" : ""}`}
      >
        <span className="app-avatar grid h-6 w-6 place-items-center overflow-hidden rounded-full text-[10px] font-semibold">
          <CachedAvatar
            user={user}
            alt={label}
            className="h-full w-full object-cover"
            fallback={initialsFromName(user.name, user.email)}
          />
        </span>
        {label}
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <div ref={rootRef} className="relative min-w-0 max-w-full">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="shrink-0 text-xs font-medium text-muted">Assigned to</span>
          <button
            type="button"
            className="min-w-0 rounded-lg transition interactive-hover"
            onClick={() => setExpanded(true)}
            title="View or change assignees"
          >
            <AssigneeCluster
              assignees={selectedMembers}
              emptyLabel="No one"
              size="sm"
            />
          </button>
          <button
            type="button"
            className="link-accent shrink-0 text-xs font-semibold hover:underline"
            onClick={() => setExpanded(true)}
          >
            {selectedMembers.length === 0 ? "Assign" : "Change"}
          </button>
        </div>
        {expanded && (
          <div className="absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,20rem)]">
            <AssigneeSearchPanel
              members={members}
              selectedIds={selectedIds}
              search={search}
              onSearchChange={setSearch}
              onToggleMember={toggleMember}
              onClose={closePicker}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!expanded ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedMembers.map((member) => renderMemberButton(member, true, true))}
          {previewMembers.map((member) => renderMemberButton(member, false, true))}
          {hiddenCount > 0 && (
            <button
              type="button"
              className="link-accent text-xs font-semibold hover:underline"
              onClick={() => setExpanded(true)}
            >
              +{hiddenCount} more
            </button>
          )}
          {members.length === 0 && (
            <p className="text-xs text-muted">No project members available.</p>
          )}
        </div>
      ) : (
        <AssigneeSearchPanel
          members={members}
          selectedIds={selectedIds}
          search={search}
          onSearchChange={setSearch}
          onToggleMember={toggleMember}
          onClose={closePicker}
        />
      )}
    </div>
  );
}

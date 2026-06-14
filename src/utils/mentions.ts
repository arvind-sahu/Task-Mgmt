/** User id list for @mention autocomplete and server validation. */
export type MentionUser = {
  id: string;
  name: string | null;
  email: string;
};

export function mentionDisplayLabel(user: MentionUser): string {
  return user.name?.trim() || user.email.split("@")[0] || user.email;
}

export function filterMentionUsers(users: MentionUser[], query: string): MentionUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users.slice(0, 8);

  return users
    .filter((user) => {
      const label = mentionDisplayLabel(user).toLowerCase();
      const email = user.email.toLowerCase();
      const emailLocal = email.split("@")[0] ?? "";
      return label.includes(q) || email.includes(q) || emailLocal.includes(q);
    })
    .slice(0, 8);
}

/** Extract user ids from TipTap mention spans in persisted HTML. */
export function extractMentionedUserIds(html: string): string[] {
  const ids = new Set<string>();
  const spanRe = /<span\b[^>]*data-type="mention"[^>]*>/gi;
  let spanMatch: RegExpExecArray | null;

  while ((spanMatch = spanRe.exec(html)) !== null) {
    const tag = spanMatch[0];
    const idMatch = tag.match(/data-id="([^"]+)"/i);
    if (idMatch?.[1]) ids.add(idMatch[1]);
  }

  return [...ids];
}

export function projectMembersToMentionUsers(
  members: Array<{ user: { id: string; name: string | null; email: string } }>,
  owner?: { id: string; name: string | null; email: string } | null,
): MentionUser[] {
  const byId = new Map<string, MentionUser>();

  for (const member of members) {
    byId.set(member.user.id, {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
    });
  }

  if (owner && !byId.has(owner.id)) {
    byId.set(owner.id, {
      id: owner.id,
      name: owner.name,
      email: owner.email,
    });
  }

  return [...byId.values()].sort((a, b) =>
    mentionDisplayLabel(a).localeCompare(mentionDisplayLabel(b)),
  );
}

export function richTextPlainPreview(html: string, maxLength = 240): string {
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

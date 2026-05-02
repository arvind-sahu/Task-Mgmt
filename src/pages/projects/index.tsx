import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";

import Layout from "~/components/Layout";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/utils/api";

const COLOR_PRESETS = [
  "#6366F1", // indigo
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#0EA5E9", // sky
  "#8B5CF6", // violet
];

export default function ProjectsPage() {
  const projects = api.project.list.useQuery();
  const utils = api.useUtils();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [showForm, setShowForm] = useState(false);

  const create = api.project.create.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      setName("");
      setDescription("");
      setShowForm(false);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ name, description: description || undefined, color });
  }

  return (
    <Layout title="Projects">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-slate-500">
            Group tasks and collaborate with your team
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn-primary"
        >
          {showForm ? "Cancel" : "New project"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mb-6 space-y-4">
          <div>
            <label className="label" htmlFor="p-name">
              Name
            </label>
            <input
              id="p-name"
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-desc">
              Description
            </label>
            <textarea
              id="p-desc"
              className="input mt-1"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div>
            <span className="label">Color</span>
            <div className="mt-2 flex gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-md ring-2 ring-offset-2 transition ${
                    color === c ? "ring-slate-900" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {create.error && (
            <p className="text-sm text-red-600">{create.error.message}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={create.isPending}
            >
              {create.isPending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.isLoading && (
          <p className="text-sm text-slate-500">Loading…</p>
        )}
        {projects.data?.length === 0 && (
          <div className="card col-span-full text-center text-sm text-slate-500">
            No projects yet — create your first one to get started.
          </div>
        )}
        {projects.data?.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="card transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: p.color }}
              />
              <h3 className="truncate text-base font-semibold">{p.name}</h3>
            </div>
            {p.description && (
              <p className="mt-2 line-clamp-3 text-sm text-slate-500">
                {p.description}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                {p._count.tasks} tasks · {p._count.members} members
              </span>
              <span>by {p.owner.name ?? p.owner.email}</span>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  const session = await getServerAuthSession(ctx);
  if (!session) {
    return { redirect: { destination: "/auth/signin", permanent: false } };
  }
  return { props: {} };
}

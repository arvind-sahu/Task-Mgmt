import { useEffect, useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import Layout from "~/components/Layout";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";
import ThemePicker from "~/components/ThemePicker";

/** A common (non-exhaustive) timezone list for the profile dropdown. */
const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/**
 * Profile / preferences page. Lets the signed-in user edit their name, bio,
 * timezone, and avatar URL.
 */
export default function ProfilePage() {
  const router = useRouter();
  const me = api.user.me.useQuery();
  const utils = api.useUtils();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [image, setImage] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const activeTab = router.query.tab === "settings" ? "settings" : "profile";

  const initials = initialsFromName(name || me.data?.name, me.data?.email);

  // Hydrate local state once the query resolves.
  useEffect(() => {
    if (me.data) {
      setName(me.data.name ?? "");
      setBio(me.data.bio ?? "");
      setTimezone(me.data.timezone ?? "UTC");
      setImage(me.data.image ?? "");
    }
  }, [me.data]);

  const update = api.user.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.user.me.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    update.mutate({
      name,
      bio: bio || undefined,
      timezone,
      image: image || null,
    });
  }

  async function handleImageUpload(file: File) {
    setImageError(null);
    if (!file.type.startsWith("image/")) return;
    if (file.size > 4 * 1024 * 1024) {
      setImageError("Please upload an image up to 4MB.");
      return;
    }
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Failed to read selected image"));
        reader.readAsDataURL(file);
      });
      setImage(dataUrl);
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <Layout title="Profile">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Profile & preferences</h1>
        <p className="text-sm text-slate-500">
          Manage your personal information
        </p>
      </div>

      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => void router.push("/profile")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            activeTab === "profile"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => void router.push("/profile?tab=settings")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            activeTab === "settings"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Settings
        </button>
      </div>

      <div className="card mb-5 max-w-2xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Profile photo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste an image URL or upload directly from your device.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700 ring-2 ring-indigo-200">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={name || "Profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1">
            <input
              className="input"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
            />
            <div className="mt-2">
              <label className="btn-ghost cursor-pointer">
                {uploadingImage ? "Uploading..." : "Upload from device"}
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void handleImageUpload(file);
                    }
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">Supports phone/laptop image picker, max 4MB.</p>
        {imageError && <p className="text-xs text-red-600">{imageError}</p>}
      </div>

      {activeTab === "settings" ? (
        <div className="card max-w-2xl space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Theme</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose your preferred application look and feel.
            </p>
          </div>
          <ThemePicker />
        </div>
      ) : (
        <form onSubmit={submit} className="card max-w-2xl space-y-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700 ring-2 ring-indigo-200">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={name || "Profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{me.data?.email}</p>
            <p className="text-xs text-slate-500">
              Email is used for sign-in and cannot be changed
            </p>
          </div>
        </div>

        <div>
          <label className="label">Display name</label>
          <input
            className="input mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>

        <div>
          <label className="label">Avatar URL (optional)</label>
          <input
            className="input mt-1"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div>
          <label className="label">Bio</label>
          <textarea
            className="input mt-1"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            placeholder="Tell your team a bit about yourself…"
          />
        </div>

        <div>
          <label className="label">Timezone</label>
          <select
            className="input mt-1"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {update.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
            {update.error.message}
          </p>
        )}
        {saved && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
            Saved
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-primary"
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
        </form>
      )}
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

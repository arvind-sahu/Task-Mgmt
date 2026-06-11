import { signOut } from "next-auth/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";
import { api } from "~/utils/api";
import { initialsFromName } from "~/utils/avatar";
import { SecurityPanel } from "~/components/SecurityPanel";
import ThemePicker from "~/components/ThemePicker";
import { CachedAvatar } from "~/components/CachedAvatar";
import { uploadProfileImageWithPresignedUrl } from "~/utils/s3Upload";

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
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabParam = router.query.tab;
  const activeTab =
    tabParam === "settings"
      ? "settings"
      : tabParam === "security"
        ? "security"
        : "profile";

  const initials = initialsFromName(name || me.data?.name, me.data?.email);

  // Hydrate local state once the query resolves.
  useEffect(() => {
    if (me.data) {
      setName(me.data.name ?? "");
      setCompanyName(me.data.companyName ?? "");
      setJobTitle(me.data.jobTitle ?? "");
      setDepartment(me.data.department ?? "");
      setBio(me.data.bio ?? "");
      setTimezone(me.data.timezone ?? "UTC");
    }
  }, [me.data]);

  const update = api.user.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.user.me.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });
  const getImageUploadUrl = api.user.getImageUploadUrl.useMutation();
  const confirmProfileImage = api.user.confirmProfileImage.useMutation({
    onSuccess: async () => {
      await utils.user.me.invalidate();
    },
  });
  const clearProfileImage = api.user.clearProfileImage.useMutation({
    onSuccess: async () => {
      await utils.user.me.invalidate();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    update.mutate({
      name,
      companyName: companyName || undefined,
      jobTitle: jobTitle,
      department: department,
      bio: bio || undefined,
      timezone,
    });
  }

  async function handleImageUpload(file: File) {
    setImageError(null);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploadingImage(true);
    try {
      const objectKey = await uploadProfileImageWithPresignedUrl(file, (input) =>
        getImageUploadUrl.mutateAsync(input),
      );
      await confirmProfileImage.mutateAsync({ objectKey });
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : "Failed to upload profile photo.",
      );
    } finally {
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      setUploadingImage(false);
    }
  }

  async function handleRemovePhoto() {
    setImageError(null);
    await clearProfileImage.mutateAsync();
    setPhotoMenuOpen(false);
  }

  useEffect(() => {
    function closeOnOutsideClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest("[data-photo-menu]")) {
        setPhotoMenuOpen(false);
      }
    }
    if (photoMenuOpen) {
      document.addEventListener("mousedown", closeOnOutsideClick, true);
    }
    return () =>
      document.removeEventListener("mousedown", closeOnOutsideClick, true);
  }, [photoMenuOpen]);

  return (
    <Layout title="Profile" contentClassName="app-main relative z-0 mx-auto w-full min-w-0 max-w-[1600px] flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="min-w-0 max-w-full">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl font-semibold sm:text-2xl">Profile & preferences</h1>
        <p className="text-sm text-slate-500">
          Manage your personal information
        </p>
      </div>

      <div className="mb-4 grid w-full max-w-2xl grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => void router.push("/profile")}
          className={`rounded-md px-2 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
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
          className={`rounded-md px-2 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
            activeTab === "settings"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => void router.push("/profile?tab=security")}
          className={`rounded-md px-2 py-1.5 text-xs font-medium sm:px-3 sm:text-sm ${
            activeTab === "security"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Security
        </button>
      </div>

      {activeTab === "security" ? (
        <div className="card w-full max-w-2xl overflow-hidden">
          <SecurityPanel />
        </div>
      ) : activeTab === "settings" ? (
        <div className="card w-full max-w-2xl space-y-5 overflow-hidden">
          <div>
            <h2 className="text-lg font-semibold">Theme</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose your preferred application look and feel.
            </p>
          </div>
          <ThemePicker />
        </div>
      ) : (
        <form onSubmit={submit} className="card w-full max-w-2xl space-y-5 overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0" data-photo-menu>
            <button
              type="button"
              onClick={() => setPhotoMenuOpen((prev) => !prev)}
              className="app-avatar grid h-16 w-16 place-items-center overflow-hidden rounded-full text-xl font-semibold transition hover:opacity-90"
              title="Update profile photo"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={name || "Profile"}
                  className="h-full w-full object-cover"
                />
              ) : me.data ? (
                <CachedAvatar
                  user={me.data}
                  alt={name || "Profile"}
                  className="h-full w-full object-cover"
                  fallback={initials}
                />
              ) : (
                initials
              )}
            </button>
            {photoMenuOpen && (
              <div className="absolute left-0 top-[72px] z-20 w-[min(15rem,calc(100vw-2.5rem))] rounded-md border border-slate-200 bg-white p-1 shadow-lg sm:w-60">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  {uploadingImage ? "Uploading..." : "Upload photo"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemovePhoto()}
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Remove photo
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (file) {
                  await handleImageUpload(file);
                  setPhotoMenuOpen(false);
                }
                input.value = "";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-all text-sm font-medium">{me.data?.email}</p>
            <p className="text-xs text-slate-500">
              Email is used for sign-in and cannot be changed
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Click profile photo to upload/update/remove
            </p>
            {imageError && <p className="mt-1 text-xs text-red-600">{imageError}</p>}
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
          <label className="label">Company</label>
          <input
            className="input mt-1"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            minLength={2}
            maxLength={120}
            required
            placeholder="Tasker"
          />
          <p className="mt-1 text-xs text-slate-500">
            Used to scope teammate search and project invites to your organization.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label">Job title</label>
            <input
              className="input mt-1"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Product Manager"
            />
          </div>
          <div>
            <label className="label">Department</label>
            <input
              className="input mt-1"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              maxLength={120}
              placeholder="e.g. Engineering"
            />
          </div>
        </div>

        <div>
          <label className="label">Email</label>
          <input
            className="input mt-1 cursor-not-allowed opacity-70"
            value={me.data?.email ?? ""}
            readOnly
            disabled
          />
          <p className="mt-1 text-xs text-slate-500">
            Email is used for sign-in and cannot be updated.
          </p>
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

      <div className="card mt-6 w-full max-w-2xl p-4">
        <h2 className="text-sm font-semibold text-heading">Account</h2>
        <p className="mt-1 text-sm text-muted">
          Sign out of Tasker on this device.
        </p>
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
          className="mt-3 rounded-md px-4 py-2 text-sm font-medium transition hover:bg-[var(--danger-hover-bg)]"
          style={{ color: "var(--danger-text)" }}
        >
          Sign out
        </button>
      </div>
      </div>
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

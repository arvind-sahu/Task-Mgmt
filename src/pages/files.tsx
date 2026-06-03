import type { GetServerSidePropsContext } from "next";

import { ComingSoonPage } from "~/components/app/ComingSoonPage";
import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";

export default function FilesPage() {
  return (
    <Layout title="Files">
      <ComingSoonPage
        title="Files"
        description="Browse attachments and shared files across all your projects."
      />
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

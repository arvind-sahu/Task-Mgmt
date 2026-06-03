import type { GetServerSidePropsContext } from "next";

import { ComingSoonPage } from "~/components/app/ComingSoonPage";
import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";

export default function TeamsPage() {
  return (
    <Layout title="Teams">
      <ComingSoonPage
        title="Teams"
        description="Organize people across projects, manage roles, and see team workload in one place."
      />
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

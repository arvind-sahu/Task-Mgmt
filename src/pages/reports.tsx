import type { GetServerSidePropsContext } from "next";

import { ComingSoonPage } from "~/components/app/ComingSoonPage";
import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";

export default function ReportsPage() {
  return (
    <Layout title="Reports">
      <ComingSoonPage
        title="Reports"
        description="Burndown charts, velocity trends, and exportable reports for stakeholders."
      />
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

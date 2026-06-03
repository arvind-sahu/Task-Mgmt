import type { GetServerSidePropsContext } from "next";

import { ComingSoonPage } from "~/components/app/ComingSoonPage";
import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";

export default function TimeTrackingPage() {
  return (
    <Layout title="Time Tracking">
      <ComingSoonPage
        title="Time Tracking"
        description="Log time on tasks and compare estimates vs actuals per sprint."
      />
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

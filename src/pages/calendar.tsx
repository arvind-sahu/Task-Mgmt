import type { GetServerSidePropsContext } from "next";

import { ComingSoonPage } from "~/components/app/ComingSoonPage";
import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";

export default function CalendarPage() {
  return (
    <Layout title="Calendar">
      <ComingSoonPage
        title="Calendar"
        description="View deadlines and sprint milestones on a shared calendar."
      />
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

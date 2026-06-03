import type { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";

import { ComingSoonPage } from "~/components/app/ComingSoonPage";
import Layout from "~/components/Layout";
import { requireAuth } from "~/server/auth";

export default function ComingSoonRoute() {
  const router = useRouter();
  const feature =
    typeof router.query.feature === "string"
      ? router.query.feature.replace(/\+/g, " ")
      : "This feature";
  const projectId =
    typeof router.query.project === "string" ? router.query.project : undefined;

  return (
    <Layout title={feature}>
      <ComingSoonPage
        title={feature}
        description={`${feature} is on our roadmap. Your project board and tasks are ready to use today.`}
        backHref={projectId ? `/projects/${projectId}` : "/dashboard"}
        backLabel={projectId ? "Back to board" : "Back to dashboard"}
      />
    </Layout>
  );
}

export function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAuth(ctx);
}

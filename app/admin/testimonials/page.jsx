import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminTestimonialsManager from "../../components/AdminTestimonialsManager";
import Layout from "../../components/Layout";
import { readAdminAccessFromCookieStore } from "../../lib/adminAccess.js";
import { reportServerError } from "../../lib/observability.server.js";

export const metadata = {
  title: "Admin Testimonials | FinTrak",
  description: "Moderate testimonial submissions for FinTrak.",
};

export default async function AdminTestimonialsPage() {
  const cookieStore = await cookies();
  const access = await readAdminAccessFromCookieStore(cookieStore);

  if (access.error) {
    await reportServerError({
      event: "admin.page.access_lookup_failed",
      message: "Failed to verify admin access for the testimonials page.",
      error: access.error,
      context: { sessionUserId: access.session?.id || null },
    });
  }

  if (!access.ok) {
    redirect("/");
  }

  return (
    <Layout>
      <AdminTestimonialsManager />
    </Layout>
  );
}

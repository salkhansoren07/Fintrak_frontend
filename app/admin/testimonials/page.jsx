import AdminTestimonialsManager from "../../components/AdminTestimonialsManager";
import Layout from "../../components/Layout";

export const metadata = {
  title: "Admin Testimonials | FinTrak",
  description: "Moderate testimonial submissions for FinTrak.",
};

export default function AdminTestimonialsPage() {
  return (
    <Layout>
      <AdminTestimonialsManager />
    </Layout>
  );
}

import Layout from "../../components/Layout";
import AdminMlDiagnosticsPage from "../../components/AdminMlDiagnosticsPage";

export const metadata = {
  title: "Admin ML Diagnostics | FinTrak",
  description: "Review ML category sync diagnostics for FinTrak.",
};

export default function AdminMlPage() {
  return (
    <Layout>
      <AdminMlDiagnosticsPage />
    </Layout>
  );
}

import { ErrorPage } from "@/components/ErrorPage";

export const metadata = { title: "404 — BIRGE" };

export default function NotFound() {
  return <ErrorPage code="404" />;
}

import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "NAAMI — Sign In",
  description: "Sign in to your NAAMI account.",
};

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

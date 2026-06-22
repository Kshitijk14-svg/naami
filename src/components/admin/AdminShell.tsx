"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@/models/roles";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

interface SessionData {
  authenticated: boolean;
  email?: string;
  name?: string;
  role?: Role;
}

interface Props {
  children: React.ReactNode;
}

export function AdminShell({ children }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: SessionData) => {
        if (!data.authenticated) {
          router.replace("/auth?from=/admin");
        } else {
          setSession(data);
        }
      })
      .catch(() => router.replace("/auth?from=/admin"));
  }, [router]);

  if (!session) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F4F0E6" }}
      >
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#8B1A1A" }} />
      </div>
    );
  }

  const role = session.role!;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#F4F0E6" }}>
      <AdminSidebar role={role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopbar email={session.email} name={session.name} role={role} />
        <main className="flex-1 overflow-y-auto" style={{ padding: "40px 32px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

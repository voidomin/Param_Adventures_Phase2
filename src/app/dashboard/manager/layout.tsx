"use client";

import RoleGuardLayout from "@/components/layout/RoleGuardLayout";

export default function ManagerDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGuardLayout
      allowedRoles={["TRIP_MANAGER", "ADMIN", "SUPER_ADMIN"]}
      fallbackRedirects={{ TREK_LEAD: "/dashboard/trek-lead" }}
    >
      {children}
    </RoleGuardLayout>
  );
}

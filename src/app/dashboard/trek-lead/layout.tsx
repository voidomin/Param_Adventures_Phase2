"use client";

import RoleGuardLayout from "@/components/layout/RoleGuardLayout";

export default function TrekLeadDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RoleGuardLayout
      allowedRoles={["TREK_LEAD", "ADMIN", "SUPER_ADMIN"]}
      fallbackRedirects={{ TRIP_MANAGER: "/dashboard/manager" }}
    >
      {children}
    </RoleGuardLayout>
  );
}

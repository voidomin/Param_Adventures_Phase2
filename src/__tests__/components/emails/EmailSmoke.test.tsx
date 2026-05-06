import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import React from "react";

import BookingConfirmedEmail from "@/components/emails/BookingConfirmedEmail";
import BookingCancelledEmail from "@/components/emails/BookingCancelledEmail";
import RefundResolvedEmail from "@/components/emails/RefundResolvedEmail";
import WelcomeEmail from "@/components/emails/WelcomeEmail";
import RoleAssignedEmail from "@/components/emails/RoleAssignedEmail";
import TripCompletedEmail from "@/components/emails/TripCompletedEmail";
import PasswordResetEmail from "@/components/emails/PasswordResetEmail";
import AdminInviteEmail from "@/components/emails/AdminInviteEmail";
import { EmailBase } from "@/components/emails/EmailBase";

describe("email components", () => {
  it("renders all email templates", async () => {
    const templates = [
      React.createElement(BookingConfirmedEmail, {
        userName: "A",
        tripName: "B",
        bookingId: "C",
      }),
      React.createElement(BookingCancelledEmail, {
        userName: "A",
        tripName: "B",
        bookingId: "C",
      }),
      React.createElement(RefundResolvedEmail, {
        userName: "A",
        bookingId: "C",
        amount: 123,
      }),
      React.createElement(WelcomeEmail, { userName: "A" }),
      React.createElement(RoleAssignedEmail, { userName: "A", role: "MANAGER" }),
      React.createElement(TripCompletedEmail, { userName: "A", tripName: "B" }),
      React.createElement(PasswordResetEmail, { userName: "A", resetLink: "https://example.com/reset" }),
      React.createElement(AdminInviteEmail, { userName: "A", setupLink: "https://example.com/setup" }),
    ];

    for (const template of templates) {
      const html = await render(template);
      expect(html).toContain("<html");
    }
  });

  it("renders EmailBase admin and gold themes and optional subheading branch", async () => {
    const adminHtml = await render(
      <EmailBase
        preview="Admin preview"
        heading="Admin heading"
        subheading="Admin subheading"
        theme="admin"
      >
        <div>Admin body</div>
      </EmailBase>
    );

    const goldNoSubheadingHtml = await render(
      <EmailBase
        preview="Gold preview"
        heading="Gold heading"
        theme="gold"
      >
        <div>Gold body</div>
      </EmailBase>
    );

    expect(adminHtml).toContain("Admin subheading");
    expect(goldNoSubheadingHtml).not.toContain("Admin subheading");
    expect(goldNoSubheadingHtml).toContain("Gold heading");
  });
});

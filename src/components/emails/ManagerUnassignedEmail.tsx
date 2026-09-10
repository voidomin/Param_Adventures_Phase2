import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles, priceStyles } from "./EmailBase";

export interface ManagerUnassignedEmailProps {
  tripName: string;
  slotDate: string;
  daysUntilDeparture: number;
}

export const ManagerUnassignedEmail = ({
  tripName = "Himalayan Trek",
  slotDate = "",
  daysUntilDeparture = 0,
}: ManagerUnassignedEmailProps) => {
  return (
    <EmailBase
      preview={`No Trip Manager assigned for ${tripName}, departing in ${daysUntilDeparture} day(s)`}
      heading="Unstaffed Trip Alert"
      subheading="No Trip Manager Assigned"
      theme="admin"
    >
      <Text style={commonStyles.text}>Hey there 👋</Text>
      <Text style={commonStyles.text}>
        <strong>{tripName}</strong> departs on <strong>{slotDate}</strong> ({daysUntilDeparture} day
        {daysUntilDeparture === 1 ? "" : "s"} away) and has no Trip Manager assigned yet. Without one, nobody
        can assign a Trek Lead, and this trip risks departing unstaffed.
      </Text>

      <Section style={priceStyles.noticeContainer}>
        <Text style={priceStyles.noticeText}>
          ⚠️ Please assign a Trip Manager to this trip as soon as possible.
        </Text>
      </Section>

      <Section style={commonStyles.btnContainer}>
        <Link href="https://paramadventures.in/admin/trips" style={commonStyles.button("#4F46E5", "#ffffff")}>
          Assign a Trip Manager →
        </Link>
      </Section>
    </EmailBase>
  );
};

export default ManagerUnassignedEmail;

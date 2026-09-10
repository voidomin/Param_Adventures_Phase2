import { Section, Text, Link } from "@react-email/components";
import { EmailBase, commonStyles, priceStyles } from "./EmailBase";

export interface TrekLeadUnassignedEmailProps {
  managerName: string;
  tripName: string;
  slotDate: string;
  daysUntilDeparture: number;
  slotId: string;
}

export const TrekLeadUnassignedEmail = ({
  managerName = "Manager",
  tripName = "Himalayan Trek",
  slotDate = "",
  daysUntilDeparture = 0,
  slotId = "",
}: TrekLeadUnassignedEmailProps) => {
  return (
    <EmailBase
      preview={`No Trek Lead assigned for ${tripName}, departing in ${daysUntilDeparture} day(s)`}
      heading="Unstaffed Trip Alert"
      subheading="No Trek Lead Assigned"
      theme="admin"
    >
      <Text style={commonStyles.text}>
        Hey <strong>{managerName}</strong> 👋
      </Text>
      <Text style={commonStyles.text}>
        You&apos;re the assigned Trip Manager for <strong>{tripName}</strong>, departing on{" "}
        <strong>{slotDate}</strong> ({daysUntilDeparture} day{daysUntilDeparture === 1 ? "" : "s"} away), and
        no Trek Lead has been assigned yet. Without one, this trip won&apos;t auto-start on departure day.
      </Text>

      <Section style={priceStyles.noticeContainer}>
        <Text style={priceStyles.noticeText}>
          ⚠️ Please assign a Trek Lead to this trip as soon as possible.
        </Text>
      </Section>

      <Section style={commonStyles.btnContainer}>
        <Link
          href={`https://paramadventures.in/dashboard/manager/trips/${slotId}`}
          style={commonStyles.button("#4F46E5", "#ffffff")}
        >
          Assign a Trek Lead →
        </Link>
      </Section>
    </EmailBase>
  );
};

export default TrekLeadUnassignedEmail;

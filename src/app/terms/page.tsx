import { Metadata } from "next";
import LegalLayout from "@/components/layout/LegalLayout";

export const metadata: Metadata = {
  title: "Terms & Conditions | Param Adventures",
  description: "Terms and conditions for booking experiences.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions">
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">1</span> Booking & Participation Policy
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>A minimum of 10–12 participants is required to conduct a trek/trip.</li>
            <li>If minimum bookings are not met or permits are unavailable, an alternative trek or rescheduled date will be offered. No refunds will be provided in such cases.</li>
            <li>Seat allocation in transport is not pre-assigned and will be on a first-come, first-served basis at the time of boarding.</li>
            <li>Changing the trek, batch, or date is subject to availability.</li>
            <li>The Organizer reserves the right to accept or decline any participant at its sole discretion.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">2</span> Itinerary & Operational Changes
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>All itineraries are indicative and subject to change due to weather, traffic, permits, or government regulations.</li>
            <li>Pickup/drop timings, routes, and activities may be modified without prior notice.</li>
            <li>Delays in transportation (including jeeps or buses) may occur due to unforeseen circumstances.</li>
            <li>This is not a luxury trip; participants should be prepared for a basic outdoor experience.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">3</span> Accommodation & Food
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>Accommodation may include tents, dormitories, sleeping bags, or open-sky arrangements with basic facilities.</li>
            <li>Only vegetarian meals will be provided, which will be simple, fresh, and hygienic.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">4</span> Fitness & Safety Guidelines
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>A moderate level of physical fitness is required.</li>
            <li>Participants are responsible for their ability to complete the trek/trip.</li>
            <li>Always stay with the group and follow instructions from the trek leader.</li>
            <li>Entering water bodies (sea, streams, waterfalls) is strictly prohibited without permission.</li>
            <li>Avoid risky behavior, especially while taking photographs.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">5</span> Code of Conduct
          </h2>
          <p className="text-foreground/80 mb-4">Participants must maintain discipline and adhere to all instructions. The following are strictly prohibited:</p>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>Consumption or possession of alcohol, smoking products, or intoxicants</li>
            <li>Littering or causing environmental damage</li>
            <li>
              Misconduct, including:
              <ul className="list-[circle] pl-5 mt-2 space-y-1">
                <li>Verbal or physical abuse</li>
                <li>Threatening or aggressive behavior</li>
                <li>Discriminatory, religious, or political remarks</li>
                <li>Sexual misconduct of any kind</li>
              </ul>
            </li>
          </ul>
          <p className="text-foreground/80 mt-4 font-bold text-red-500/90">Violation of these rules will result in immediate termination without refund, and the participant must bear any additional costs incurred.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">6</span> Grounds for Termination
          </h2>
          <p className="text-foreground/80 mb-4">The Organizer reserves the right to terminate participation without refund if:</p>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>The participant violates rules or engages in misconduct</li>
            <li>The participant is medically or physically unfit to continue</li>
            <li>The participant’s behavior negatively impacts the group</li>
          </ul>
          <p className="text-foreground/80 mt-4 font-bold text-red-500/90">All expenses for return, evacuation, or additional arrangements shall be borne by the participant.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">7</span> Participant Responsibility & Withdrawal
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>Participants must not leave the group without informing the trek leader.</li>
            <li>If a participant chooses to leave the trip voluntarily, they must provide written confirmation, after which the Organizer holds no responsibility for their safety or well-being.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">8</span> Risk Acknowledgment
          </h2>
          <p className="text-foreground/80 mb-4">Trekking and adventure travel involve inherent risks, including but not limited to:</p>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>Natural hazards (weather changes, landslides, wildlife)</li>
            <li>Health risks (altitude sickness, dehydration, injuries)</li>
            <li>Travel-related risks (delays, accidents, unforeseen disruptions)</li>
          </ul>
          <p className="text-foreground/80 mt-4 font-semibold">Participants acknowledge and accept these risks voluntarily.</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">9</span> Medical Emergencies
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>The Organizer is not liable for medical expenses.</li>
            <li>
              Participants must bear all costs related to:
              <ul className="list-[circle] pl-5 mt-2 space-y-1">
                <li>Treatment and hospitalization</li>
                <li>Emergency evacuation</li>
                <li>Return travel</li>
              </ul>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">10</span> Liability Disclaimer
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>The Organizer is not responsible for loss, theft, or damage of personal belongings.</li>
            <li>Participants are solely responsible for their safety, conduct, and personal items.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">11</span> Photography & Media Rights
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>The Organizer reserves the right to capture and use photos/videos for promotional purposes.</li>
            <li>By participating, the participant grants a royalty-free, perpetual license for such use.</li>
            <li>Participants who do not consent must inform the Organizer in writing prior to the trip and ensure they avoid media capture.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">12</span> Environmental Responsibility
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>Participants must respect nature and avoid littering or pollution.</li>
            <li>Any environmental damage may result in immediate termination without refund.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-foreground">
            <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0">13</span> Governing Law & Jurisdiction
          </h2>
          <ul className="list-disc pl-5 space-y-3 text-foreground/80 leading-relaxed">
            <li>These terms shall be governed by and construed in accordance with the laws of India.</li>
            <li>Any disputes shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka.</li>
          </ul>
        </section>
      </div>
    </LegalLayout>
  );
}

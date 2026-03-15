import { Metadata } from "next";
import { prisma } from "@/lib/db";
import StoryPageClient from "@/components/story/StoryPageClient";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "Discover the journey behind Param Adventures — from a passion for the mountains to curating life-changing experiences across India's most breathtaking landscapes.",
  openGraph: {
    title: "Our Story | Param Adventures",
    description:
      "Discover the journey behind Param Adventures — from a passion for the mountains to curating life-changing experiences.",
    type: "website",
  },
};

// Fallback blocks for when the DB is fresh / empty
const FALLBACK_BLOCKS = [
  {
    id: "f-hero",
    type: "hero",
    title: "Born from the Mountains",
    subtitle:
      "What started as a group of friends chasing sunrises on remote trails has grown into India's most passionate adventure community.",
    body: null,
    imageUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2670&auto=format&fit=crop",
    stat: null,
    order: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "f-m1",
    type: "milestone",
    title: "The First Trek",
    subtitle: "A group of 8 friends set out on a Himalayan trail that changed everything.",
    body: "It was a cold December morning when our founders took their first step into the wild. With nothing but a backpack, a dream, and an unshakable belief that adventure should be accessible to everyone — Param Adventures was born.",
    imageUrl:
      "https://images.unsplash.com/photo-1522163182402-834f871fd851?q=80&w=2603&auto=format&fit=crop",
    stat: "2019",
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "f-m2",
    type: "milestone",
    title: "Building the Community",
    subtitle: "From 8 friends to hundreds of adventurers joining every season.",
    body: "Word spread. Through social media stories, campfire conversations, and genuine reviews from trekkers who returned transformed — our community grew organically. We never spent a single rupee on ads. Real stories did the talking.",
    imageUrl:
      "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?q=80&w=2676&auto=format&fit=crop",
    stat: "500+",
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "f-v1",
    type: "value",
    title: "Safety First",
    subtitle: "Every route scouted. Every guide certified. Every trip insured.",
    body: null,
    imageUrl: null,
    stat: "🛡️",
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "f-v2",
    type: "value",
    title: "Authentic Experiences",
    subtitle: "We don't do tourist traps. We create stories worth retelling.",
    body: null,
    imageUrl: null,
    stat: "🏔️",
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "f-v3",
    type: "value",
    title: "Leave No Trace",
    subtitle: "The mountains gave us everything. We protect them in return.",
    body: null,
    imageUrl: null,
    stat: "🌿",
    order: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "f-cta",
    type: "cta",
    title: "Your Story Starts Here",
    subtitle:
      "Join thousands of adventurers who have discovered the extraordinary. Your next chapter awaits in the mountains.",
    body: null,
    imageUrl: null,
    stat: null,
    order: 6,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export default async function OurStoryPage() {
  let blocks = await prisma.storyBlock.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  if (blocks.length === 0) {
    blocks = FALLBACK_BLOCKS as typeof blocks;
  }

  return <StoryPageClient blocks={JSON.parse(JSON.stringify(blocks))} />;
}

"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { MonitorPlay, BookOpen, Tags, AlertCircle, Loader2 } from "lucide-react";
import HeroTab from "@/components/admin/HeroTab";
import StoryTab from "@/components/admin/StoryTab";
import CategoriesTab from "@/components/admin/CategoriesTab";

function CustomizationContent() {
  const { user, hasPermission } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Define tab configuration with permissions
  const tabs = useMemo(() => {
    const allTabs = [
      {
        id: "hero",
        label: "Hero Slider",
        icon: MonitorPlay,
        component: HeroTab,
        permission: "trip:create",
      },
      {
        id: "story",
        label: "Our Story",
        icon: BookOpen,
        component: StoryTab,
        permission: "trip:create",
      },
      {
        id: "categories",
        label: "Categories",
        icon: Tags,
        component: CategoriesTab,
        permission: "trip:manage-categories",
      },
    ];

    return allTabs.filter((tab) => hasPermission(tab.permission));
  }, [hasPermission]);

  const queryTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState("");

  // Sync active tab state with URL parameter, validating against permissions
  useEffect(() => {
    if (tabs.length > 0) {
      const matched = tabs.find((t) => t.id === queryTab);
      if (matched) {
        setActiveTab(matched.id);
      } else {
        // Default to first permitted tab
        setActiveTab(tabs[0].id);
        router.replace(`/admin/customization?tab=${tabs[0].id}`);
      }
    }
  }, [queryTab, tabs, router]);

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Guard against complete lack of authorization
  if (tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-card border border-border rounded-3xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-85" />
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-foreground/60 max-w-md text-sm">
          You do not have the required permissions to access the customization settings page.
        </p>
      </div>
    );
  }

  const activeTabConfig = tabs.find((t) => t.id === activeTab) || tabs[0];
  const ActiveComponent = activeTabConfig?.component;

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/admin/customization?tab=${tabId}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-black text-foreground">Site Customization</h1>
        <p className="text-foreground/60 mt-1">
          Manage the public portal content, home sliders, category taxonomy, and brand story blocks.
        </p>
      </div>

      {/* Tabs Header Navigation */}
      <div className="flex border-b border-border/60 overflow-x-auto scrollbar-none gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer hover:text-foreground/90 ${
                isActive
                  ? "border-primary text-primary font-black"
                  : "border-transparent text-foreground/50 hover:border-foreground/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display with simple fade animation */}
      <div className="relative min-h-[300px] animate-in fade-in slide-in-from-bottom-2 duration-300">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}

export default function CustomizationHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CustomizationContent />
    </Suspense>
  );
}

"use client";

import { MapContainer } from "@/components/map/MapContainer";
import { LeftPanel } from "@/components/left-panel/LeftPanel";
import { RightPanel } from "@/components/right-panel/RightPanel";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { StatusBar } from "@/components/status-bar/StatusBar";
import { useDataLoader } from "@/hooks/use-data-loader";
import { LoginPage } from "@/components/auth/LoginPage";
import { ResizablePanel } from "@/components/layout/ResizablePanel";
import { useAuthStore } from "@/stores/auth-store";
import { Toaster } from "sonner";

export default function Home() {
  const { user, checked } = useAuthStore();

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppMain />;
}

function AppMain() {
  useDataLoader();

  return (
    <div className="flex flex-col h-screen">
      <Toaster position="bottom-right" />
      <Toolbar />
      <div className="flex-1 relative overflow-hidden">
        {/* Map fills entire content area — always fixed */}
        <MapContainer />

        {/* Left panel overlays on top of map */}
        <ResizablePanel defaultWidth={280} minWidth={200} maxWidth={500} side="left">
          <LeftPanel />
        </ResizablePanel>

        {/* Right panel overlays on top of map */}
        <ResizablePanel defaultWidth={340} minWidth={240} maxWidth={600} side="right">
          <RightPanel />
        </ResizablePanel>
      </div>
      <StatusBar />
    </div>
  );
}

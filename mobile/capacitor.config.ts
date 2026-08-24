import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.travectory.mobile",
  appName: "Travectory",
  webDir: "out",
  android: { allowMixedContent: false },
};

export default config;

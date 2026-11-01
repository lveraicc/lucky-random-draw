import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lveraicc.luckyrandomdraw",
  appName: "随机一注",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};

export default config;

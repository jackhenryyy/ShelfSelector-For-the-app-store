import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jackmilliken.theshelf",
  appName: "The Shelf",
  webDir: "dist-web",

  // This makes the iOS app load your hosted website instead of local files
  server: {
  url: "http://localhost:5173",
  cleartext: true
},
};

export default config;

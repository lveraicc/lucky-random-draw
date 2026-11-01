import { mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("assets", { recursive: true });

await Promise.all([
  sharp("resources/icon-only.svg")
    .resize(1024, 1024)
    .png()
    .toFile("assets/icon-only.png"),
  sharp("resources/icon-foreground.svg")
    .resize(1024, 1024)
    .png()
    .toFile("assets/icon-foreground.png"),
  sharp("resources/icon-background.svg")
    .resize(1024, 1024)
    .png()
    .toFile("assets/icon-background.png"),
  sharp("resources/splash.svg")
    .resize(2732, 2732)
    .png()
    .toFile("assets/splash.png"),
  sharp("resources/splash.svg")
    .resize(2732, 2732)
    .png()
    .toFile("assets/splash-dark.png"),
]);

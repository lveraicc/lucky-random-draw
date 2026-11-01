# 随机一注 Android APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 React 随机摇号机封装为可离线安装、可分享给朋友的签名 Android APK。

**Architecture:** Capacitor 8.6 把 Vite 构建产物打包进 Android WebView；React 业务代码保持不变，仅增加 Android 返回键、安全区域和原生打包配置。APK 使用项目外的 Release Keystore 签名，构建产物复制到 Windows 桌面。

**Tech Stack:** Capacitor 8.6、Capacitor App 插件、React 19、Vite 8、Gradle、Java 21、Android SDK 36。

**Spec:** `docs/superpowers/specs/2026-11-01-android-capacitor-apk-design.md`

## Global Constraints

- 应用名：`随机一注`。
- 包名：`com.lveraicc.luckyrandomdraw`。
- 版本名称：`1.0.0`；版本代码：`1`。
- 构建产物：签名 Release APK，最终复制为桌面 `随机一注-1.0.0.apk`。
- Web 资源必须从 APK 本地加载，不依赖 `localhost`、GitHub Pages 或远程 CDN。
- 保留 Capacitor WebView 所需的清单级 `INTERNET` 权限，但应用不得发送网络请求。
- 禁用 Android 明文网络流量。
- 不申请相机、定位、麦克风、通讯录、短信或外部文件权限。
- Android 返回键优先关闭历史抽屉，没有抽屉时退出应用。
- 使用 `viewport-fit=cover` 和 CSS 安全区域变量适配刘海屏与底部手势区域。
- Release Keystore 保存在 `C:\Users\22360\.android\`，密码文件不得提交。
- APK、Keystore、密码和本地签名配置均不得进入公开 GitHub 仓库。
- 现有 26 个单元/组件测试、10 个浏览器 E2E 和生产构建必须继续通过。
- 当前没有安卓真机，必须明确报告真机安装未验证。

---

## 文件结构

```text
capacitor.config.ts                       Capacitor 应用身份与 webDir
resources/icon-only.svg                   完整图标矢量源
resources/icon-foreground.svg             自适应图标前景矢量源
resources/icon-background.svg             自适应图标背景矢量源
resources/splash.svg                      启动画面矢量源
scripts/generate-assets.mjs               将矢量图转为 Capacitor Assets 输入
android/                                  Capacitor 生成的原生 Android 工程
src/services/androidBack.ts               Android 返回键桥接
src/services/androidBack.test.ts          返回键单元测试
src/App.tsx                               接入原生返回键
src/styles/global.css                     安全区域和原生视口适配
index.html                                viewport-fit=cover
.github/workflows/deploy-pages.yml        网页端静态发布，保留为轻量入口
README.md                                 Android 构建与网页访问说明
```

Android SDK、JDK、Keystore 和最终 APK 均位于源代码目录之外。

---

### Task 1: 建立 Capacitor Android 工程

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Create: `capacitor.config.ts`
- Create: `.github/workflows/deploy-pages.yml`
- Create: `android/`（Capacitor 生成）
- Modify: `android/app/build.gradle`

**Interfaces:**
- Consumes: Vite 的 `dist/`。
- Produces: `appId = com.lveraicc.luckyrandomdraw`、`appName = 随机一注`、`webDir = dist` 的 Android 工程。

- [ ] **Step 1: 验证现有 Web 基线**

Run:

```powershell
npm test
npm run build
npm run e2e
```

Expected: 26 个单元/组件测试和 10 个 E2E 测试通过，构建成功。

- [ ] **Step 2: 安装 Capacitor 8.6 依赖**

Run:

```powershell
npm install @capacitor/core@8.6.0 @capacitor/android@8.6.0 @capacitor/app@8.1.2
npm install -D @capacitor/cli@8.6.0 @capacitor/assets@4.0.0
```

Expected: `package.json` 和锁文件更新，无安装错误。

- [ ] **Step 3: 配置相对资源路径与 Capacitor**

确保 `vite.config.ts` 包含：

```ts
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    restoreMocks: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

创建 `capacitor.config.ts`：

```ts
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
```

修改 `index.html` 的 viewport：

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
```

- [ ] **Step 4: 生成并同步 Android 工程**

Run:

```powershell
npx cap add android
npx cap sync android
```

Expected: 生成 `android/`；`android/app/src/main/assets/public/index.html` 存在。

- [ ] **Step 5: 固定 Android 版本并保留 WebView 权限**

在 `android/app/build.gradle` 的 `android` 块中设置：

```gradle
namespace "com.lveraicc.luckyrandomdraw"
compileSdk 36

defaultConfig {
    applicationId "com.lveraicc.luckyrandomdraw"
    minSdk 24
    targetSdk 36
    versionCode 1
    versionName "1.0.0"
    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    aaptOptions {
        ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
    }
}
```

确认 `android/app/src/main/AndroidManifest.xml`：

```xml
<uses-permission android:name="android.permission.INTERNET" />

<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/AppTheme"
    android:usesCleartextTraffic="false">
```

确认 `android/app/src/main/res/values/strings.xml`：

```xml
<resources>
    <string name="app_name">随机一注</string>
    <string name="title_activity_main">随机一注</string>
    <string name="package_name">com.lveraicc.luckyrandomdraw</string>
    <string name="custom_url_scheme">com.lveraicc.luckyrandomdraw</string>
</resources>
```

- [ ] **Step 6: 验证同步和网页回归**

Run:

```powershell
npx cap sync android
npm test
npm run build
npm run e2e
```

Expected: 同步、26 个单元测试、构建和 10 个 E2E 测试全部通过。

- [ ] **Step 7: Commit**

```powershell
git add package.json package-lock.json vite.config.ts index.html capacitor.config.ts .github android
git commit -m "feat: add Capacitor Android project"
```

---

### Task 2: 实现 Android 返回键和安全区域

**Files:**
- Create: `src/services/androidBack.ts`
- Test: `src/services/androidBack.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `@capacitor/app` 的 `addListener("backButton", listener)` 和 `exitApp()`。
- Produces:
  - `interface AndroidBackBridge`
  - `interface AndroidBackHandlers`
  - `installAndroidBackHandler(bridge, handlers): () => void`

- [ ] **Step 1: 写返回键失败测试**

`src/services/androidBack.test.ts`：

```ts
import { describe, expect, it, vi } from "vitest";
import {
  installAndroidBackHandler,
  type AndroidBackBridge,
} from "./androidBack";

function createBridge() {
  let callback: (() => void) | undefined;
  const remove = vi.fn();
  const exitApp = vi.fn().mockResolvedValue(undefined);
  const bridge: AndroidBackBridge = {
    addListener: vi.fn(async (_event, listener) => {
      callback = listener;
      return { remove };
    }),
    exitApp,
  };
  return {
    bridge,
    exitApp,
    remove,
    pressBack: () => callback?.(),
  };
}

describe("installAndroidBackHandler", () => {
  it("closes an open history drawer instead of exiting", async () => {
    const { bridge, exitApp, pressBack } = createBridge();
    const closeHistory = vi.fn();

    installAndroidBackHandler(bridge, {
      isHistoryOpen: () => true,
      closeHistory,
    });
    await Promise.resolve();
    pressBack();

    expect(closeHistory).toHaveBeenCalledTimes(1);
    expect(exitApp).not.toHaveBeenCalled();
  });

  it("exits when the history drawer is closed", async () => {
    const { bridge, exitApp, pressBack } = createBridge();

    installAndroidBackHandler(bridge, {
      isHistoryOpen: () => false,
      closeHistory: vi.fn(),
    });
    await Promise.resolve();
    pressBack();

    expect(exitApp).toHaveBeenCalledTimes(1);
  });

  it("removes the native listener when disposed", async () => {
    const { bridge, remove } = createBridge();
    const dispose = installAndroidBackHandler(bridge, {
      isHistoryOpen: () => false,
      closeHistory: vi.fn(),
    });

    await Promise.resolve();
    dispose();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 运行并确认失败**

Run:

```powershell
npm test -- src/services/androidBack.test.ts
```

Expected: FAIL，原因是 `./androidBack` 不存在。

- [ ] **Step 3: 实现原生返回键桥接**

`src/services/androidBack.ts`：

```ts
export interface AndroidBackSubscription {
  remove: () => void | Promise<void>;
}

export interface AndroidBackBridge {
  addListener: (
    event: "backButton",
    listener: () => void,
  ) => Promise<AndroidBackSubscription>;
  exitApp: () => Promise<void>;
}

export interface AndroidBackHandlers {
  isHistoryOpen: () => boolean;
  closeHistory: () => void;
}

export function installAndroidBackHandler(
  bridge: AndroidBackBridge,
  handlers: AndroidBackHandlers,
): () => void {
  let disposed = false;
  let subscription: AndroidBackSubscription | null = null;

  void bridge
    .addListener("backButton", () => {
      if (handlers.isHistoryOpen()) {
        handlers.closeHistory();
        return;
      }

      void bridge.exitApp();
    })
    .then((value) => {
      if (disposed) {
        void value.remove();
      } else {
        subscription = value;
      }
    })
    .catch(() => undefined);

  return () => {
    disposed = true;
    if (subscription) {
      void subscription.remove();
      subscription = null;
    }
  };
}
```

- [ ] **Step 4: 运行返回键测试**

Run:

```powershell
npm test -- src/services/androidBack.test.ts
```

Expected: PASS，3 个测试通过。

- [ ] **Step 5: 接入 App**

在 `src/App.tsx` 增加：

```tsx
import { App as CapacitorApp } from "@capacitor/app";
import { installAndroidBackHandler } from "./services/androidBack";
```

在组件 effect 区域增加：

```tsx
useEffect(
  () =>
    installAndroidBackHandler(CapacitorApp, {
      isHistoryOpen: () => historyOpen,
      closeHistory: () => setHistoryOpen(false),
    }),
  [historyOpen],
);
```

- [ ] **Step 6: 加入安全区域**

在 `src/styles/global.css` 的 `body` 规则加入：

```css
padding-top: env(safe-area-inset-top);
padding-right: env(safe-area-inset-right);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
```

在 `src/styles/global.css` 末尾加入：

```css
@supports (padding: max(0px)) {
  .app-shell {
    padding-left: max(0px, env(safe-area-inset-left));
    padding-right: max(0px, env(safe-area-inset-right));
  }
}
```

- [ ] **Step 7: 运行全部网页测试**

Run:

```powershell
npm test
npm run build
npm run e2e
```

Expected: 29 个单元/组件测试和 10 个 E2E 测试通过。

- [ ] **Step 8: Commit**

```powershell
git add src/services/androidBack.ts src/services/androidBack.test.ts src/App.tsx src/styles/global.css
git commit -m "feat: support Android back button and safe areas"
```

---

### Task 3: 安装 Android 工具链并配置签名

**Files:**
- Modify: `android/app/build.gradle`
- Modify: `android/.gitignore`
- Create outside repo: `C:\Users\22360\.android-sdk\`
- Create outside repo: `C:\Users\22360\.android\lucky-random-draw-release.jks`
- Create outside repo: `C:\Users\22360\.android\lucky-random-draw-release-password.txt`

**Interfaces:**
- Consumes: Android Gradle project。
- Produces: `release` signing config 与可执行 `assembleRelease`。

- [ ] **Step 1: 安装 Java 21**

Run:

```powershell
winget install --id Microsoft.OpenJDK.21 --exact --silent --accept-package-agreements --accept-source-agreements
```

Expected: Java 21 安装成功。

- [ ] **Step 2: 安装 Android Command-line Tools**

Run:

```powershell
$sdk = "$env:USERPROFILE\.android-sdk"
$zip = "$env:TEMP\commandlinetools-win.zip"
New-Item -ItemType Directory -Force -Path $sdk | Out-Null
Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip' -OutFile $zip
Expand-Archive -Path $zip -DestinationPath "$env:TEMP\android-cmdline" -Force
New-Item -ItemType Directory -Force -Path "$sdk\cmdline-tools\latest" | Out-Null
Copy-Item "$env:TEMP\android-cmdline\cmdline-tools\*" "$sdk\cmdline-tools\latest" -Recurse -Force
```

Expected: `C:\Users\22360\.android-sdk\cmdline-tools\latest\bin\sdkmanager.bat` 存在。

- [ ] **Step 3: 安装 SDK 36 和构建工具**

Run:

```powershell
$env:JAVA_HOME = (Get-ChildItem 'C:\Program Files\Microsoft\jdk-21*' -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$env:USERPROFILE\.android-sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
$licenseAnswers = (1..20 | ForEach-Object { 'y' }) -join "`n"
$licenseAnswers | & "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
& "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

Expected: Android SDK、Platform Tools、Platform 36 与 Build Tools 36 安装完成。

- [ ] **Step 4: 写本地 SDK 路径**

创建 `android/local.properties`：

```properties
sdk.dir=C\:\\Users\\22360\\.android-sdk
```

确认 `android/.gitignore` 包含：

```text
local.properties
keystore.properties
*.jks
*.keystore
app/build/
```

- [ ] **Step 5: 生成 Release Keystore**

Run:

```powershell
$env:JAVA_HOME = (Get-ChildItem 'C:\Program Files\Microsoft\jdk-21*' -Directory | Select-Object -First 1).FullName
$keytool = "$env:JAVA_HOME\bin\keytool.exe"
$store = "$env:USERPROFILE\.android\lucky-random-draw-release.jks"
$passwordFile = "$env:USERPROFILE\.android\lucky-random-draw-release-password.txt"
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$password = [Convert]::ToBase64String($bytes)
New-Item -ItemType Directory -Force -Path (Split-Path $store) | Out-Null
& $keytool -genkeypair -v -keystore $store -alias lucky-random-draw -keyalg RSA -keysize 2048 -validity 10000 -storepass $password -keypass $password -dname "CN=Lucky Random Draw, OU=Personal, O=lveraicc, L=Shanghai, ST=Shanghai, C=CN"
Set-Content -Path $passwordFile -Value $password -NoNewline
icacls $passwordFile /inheritance:r /grant:r "$env:USERNAME:(R,W)"
```

Expected: Keystore 与密码文件存在，密码文件不进入 Git。

- [ ] **Step 6: 写入本地签名配置**

从私密密码文件读取变量并创建 `android/keystore.properties`，命令不能把密码输出到终端：

```powershell
$password = Get-Content "$env:USERPROFILE\.android\lucky-random-draw-release-password.txt" -Raw
@"
storeFile=C:/Users/22360/.android/lucky-random-draw-release.jks
storePassword=$password
keyAlias=lucky-random-draw
keyPassword=$password
"@ | Set-Content 'android\keystore.properties' -NoNewline
```

在 `android/app/build.gradle` 的 `android` 块前加入：

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('keystore.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

在 `buildTypes` 前加入：

```gradle
signingConfigs {
    release {
        if (keystorePropertiesFile.exists()) {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
```

把 `buildTypes.release` 设置为：

```gradle
release {
    signingConfig signingConfigs.release
    minifyEnabled false
    proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
}
```

- [ ] **Step 7: Commit**

```powershell
git add android/app/build.gradle android/.gitignore
git commit -m "build: configure signed Android releases"
```

---

### Task 4: 生成图标、构建并验证 APK

**Files:**
- Create: `resources/icon-only.svg`
- Create: `resources/icon-foreground.svg`
- Create: `resources/icon-background.svg`
- Create: `resources/splash.svg`
- Create: `scripts/generate-assets.mjs`
- Create: `assets/icon-only.png`
- Create: `assets/icon-foreground.png`
- Create: `assets/icon-background.png`
- Create: `assets/splash.png`
- Create: `assets/splash-dark.png`
- Modify: Android generated `mipmap` and `drawable` resources
- Modify: `README.md`
- Copy outside repo: `C:\Users\22360\Desktop\随机一注-1.0.0.apk`

**Interfaces:**
- Consumes: 已签名的 Gradle Release 构建。
- Produces: 可侧载 APK 和构建验证记录。

- [ ] **Step 1: 安装图像转换依赖并创建图标源**

Run:

```powershell
npm install -D sharp@0.35.5
```

`resources/icon-only.svg`：

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="20%" r="80%">
      <stop offset="0" stop-color="#25334b"/>
      <stop offset="1" stop-color="#080e18"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>
  <circle cx="512" cy="512" r="330" fill="none" stroke="#d8a746" stroke-width="34"/>
  <circle cx="512" cy="512" r="280" fill="#101925" stroke="#ffe09a" stroke-width="6"/>
  <text x="512" y="625" text-anchor="middle" font-family="Georgia, serif" font-size="390" fill="#ffda7a">L</text>
</svg>
```

`resources/icon-foreground.svg`：

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <circle cx="512" cy="512" r="280" fill="none" stroke="#d8a746" stroke-width="38"/>
  <circle cx="512" cy="512" r="236" fill="none" stroke="#ffe09a" stroke-width="6"/>
  <text x="512" y="620" text-anchor="middle" font-family="Georgia, serif" font-size="330" fill="#ffda7a">L</text>
</svg>
```

`resources/icon-background.svg`：

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#080e18"/>
  <circle cx="512" cy="250" r="520" fill="#25334b" opacity="0.35"/>
</svg>
```

`resources/splash.svg`：

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#080e18"/>
  <circle cx="1366" cy="1240" r="330" fill="#101925" stroke="#d8a746" stroke-width="24"/>
  <text x="1366" y="1355" text-anchor="middle" font-family="Georgia, serif" font-size="390" fill="#ffda7a">L</text>
  <text x="1366" y="1740" text-anchor="middle" font-family="sans-serif" font-size="92" fill="#fff0c7">随机一注</text>
</svg>
```

`scripts/generate-assets.mjs`：

```js
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
```

- [ ] **Step 2: 生成 Android 图标和启动画面**

Run:

```powershell
node scripts/generate-assets.mjs
npx capacitor-assets generate --android
npx cap sync android
```

Expected: Android mipmap、drawable 和 splash 资源更新。

- [ ] **Step 3: 构建签名 Release APK**

Run:

```powershell
$env:JAVA_HOME = (Get-ChildItem 'C:\Program Files\Microsoft\jdk-21*' -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$env:USERPROFILE\.android-sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
Push-Location android
try {
  .\gradlew.bat assembleRelease
} finally {
  Pop-Location
}
```

Expected: `android/app/build/outputs/apk/release/app-release.apk` 生成。

- [ ] **Step 4: 验证签名、包信息和内置资源**

Run:

```powershell
$env:JAVA_HOME = (Get-ChildItem 'C:\Program Files\Microsoft\jdk-21*' -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$env:USERPROFILE\.android-sdk"
$apk = 'android\app\build\outputs\apk\release\app-release.apk'
$apksigner = "$env:ANDROID_HOME\build-tools\36.0.0\apksigner.bat"
$aapt = "$env:ANDROID_HOME\build-tools\36.0.0\aapt.exe"
& $apksigner verify --verbose --print-certs $apk
& $aapt dump badging $apk | Select-String 'package:|application-label:|sdkVersion:|targetSdkVersion:'
jar tf $apk | Select-String 'assets/public/index.html|assets/public/assets/'
```

Expected:

- 签名验证成功。
- 包名为 `com.lveraicc.luckyrandomdraw`。
- 版本名称为 `1.0.0`。
- 应用标签为“随机一注”。
- APK 包含本地 `index.html` 和构建资源。

- [ ] **Step 5: 确认 APK 不依赖远程入口**

Run:

```powershell
$apk = 'android\app\build\outputs\apk\release\app-release.apk'
$entries = jar tf $apk
if ($entries -notcontains 'assets/public/index.html') { throw 'Missing bundled index.html' }
if ($entries -match 'localhost:4173|github\.io') { throw 'Remote runtime entry found in APK' }
```

Expected: 无异常。

- [ ] **Step 6: 复制最终 APK 到桌面**

Run:

```powershell
Copy-Item 'android\app\build\outputs\apk\release\app-release.apk' "$env:USERPROFILE\Desktop\随机一注-1.0.0.apk" -Force
Get-Item "$env:USERPROFILE\Desktop\随机一注-1.0.0.apk" | Select-Object FullName,Length,LastWriteTime
```

Expected: 桌面存在 APK。

- [ ] **Step 7: 更新 README**

增加：

```markdown
## Android APK

安装包：`随机一注-1.0.0.apk`

- 支持 Android 7 及以上。
- 应用无需联网即可使用。
- 安装时 Android 可能要求允许当前文件管理器或聊天应用“安装未知应用”。
- 更新版本必须继续使用相同的包名和签名密钥。
```

- [ ] **Step 8: 运行最终回归并提交源码**

Run:

```powershell
npm test
npm run build
npm run e2e
git diff --check
```

Expected: 单元测试、E2E、构建和差异检查全部通过。

```powershell
git add resources android README.md
git commit -m "feat: add Android launcher assets and APK build"
```

---

## 计划自检

- 应用名、包名、版本：Task 1。
- 本地 Web 资源与相对路径：Task 1、Task 4。
- Android 返回键：Task 2。
- 安全区域：Task 2。
- Java 21、Android SDK 36：Task 3。
- Release Keystore 与签名：Task 3。
- 图标与启动画面：Task 4。
- APK 构建、签名、包信息和资源验证：Task 4。
- 桌面 APK 交付：Task 4。
- 密钥/APK 不提交：Task 3、Task 4。
- 现有 Web 回归：Task 1、Task 2、Task 4。
- 真机安装边界说明：Task 4 的 README 与最终报告。

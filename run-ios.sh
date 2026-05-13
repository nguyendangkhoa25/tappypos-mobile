#!/bin/bash
# Build and launch on iPhone 15 Simulator (bypasses Expo CLI's signing check)
set -e

SIMULATOR_UDID="F7EC9F5F-CFBC-49DF-8A53-19CDF754A6DB"
DERIVED_DATA="$HOME/Library/Developer/Xcode/DerivedData/TappyPOS-dhwfmqnkarsammeniawdfjdehppt"

echo "Building..."
xcodebuild \
  -workspace ios/TappyPOS.xcworkspace \
  -scheme TappyPOS \
  -sdk iphonesimulator \
  -configuration Debug \
  -destination "id=$SIMULATOR_UDID" \
  build 2>&1 | grep -E "error:|warning: .*(error|failed)|BUILD SUCCEEDED|BUILD FAILED"

APP_PATH=$(find "$DERIVED_DATA/Build/Products/Debug-iphonesimulator" -name "TappyPOS.app" -maxdepth 2 | head -1)

echo "Installing..."
xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true
xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
xcrun simctl launch "$SIMULATOR_UDID" com.knp.tappypos

echo "Done — now run: npx expo start"

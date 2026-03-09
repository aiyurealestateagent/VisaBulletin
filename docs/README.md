# caseBeacon

A native iOS app for tracking USCIS immigration case statuses. Built with SwiftUI and WidgetKit.

## Features

- **Case Tracking** — Add multiple USCIS cases by receipt number and monitor their status
- **Auto Refresh** — Background refresh with push notifications when a case status changes
- **Home Screen Widgets** — Small and medium widgets to check case status at a glance
- **Status Timeline** — Full case history with chronological status updates
- **Progress Visualization** — 5-stage progress stepper showing where your case is in the lifecycle
- **Haptic Feedback** — Tactile feedback when status changes are detected

## Requirements

- iOS 17.0+
- Xcode 16+
- Swift 6

## Setup

1. Open `caseBeacon.xcodeproj` in Xcode
2. Select a development team for both the `caseBeacon` and `caseBeaconWidgetExtensionExtension` targets
3. Build and run on a simulator or device

No external dependencies are required.

## Architecture

The app follows MVVM with Swift's `@Observable` macro and uses an `actor`-based API service for thread-safe networking.

| Layer | Component | Role |
|-------|-----------|------|
| View | SwiftUI Views | Dashboard, detail, and form screens |
| ViewModel | `CaseStore` | Observable state, persistence, refresh orchestration |
| Service | `USCISService` | OAuth token management, API calls, RFC-9457 error parsing |
| Persistence | Shared `UserDefaults` | App Group storage shared with widget extension |
| Background | `BackgroundRefreshManager` | Scheduled case refresh with notification delivery |

## API

This app integrates with the [USCIS Case Status API](https://developer.uscis.gov). It uses OAuth 2.0 client credentials for authentication and handles RFC-9457 compliant error responses.

The codebase currently points to the **sandbox** environment (`api-int.uscis.gov`). Update the endpoints in `USCISService.swift` for production use.

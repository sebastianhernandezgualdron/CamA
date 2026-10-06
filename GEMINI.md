# GEMINI.md

# PhoneCam — Open-Source Smartphone Webcam

## 1. Project Overview

PhoneCam is an open-source application that allows users to use their smartphone as a webcam for their computer.

The core idea is simple:

> Turn your smartphone into a webcam for your PC — easily, privately, locally, and for free.

The project must be:

* Open source.
* Free to use.
* Free forever.
* No subscriptions.
* No premium features.
* No advertisements.
* No watermarks.
* No mandatory accounts.
* No cloud dependency for video transmission.
* No invasive telemetry.
* Local-first.
* Easy to install.
* Easy to use.
* Transparent about how it works.

The goal is not to compete by having hundreds of features.

The goal is to provide an extremely simple, reliable, privacy-friendly way to use a phone camera as a computer webcam.

---

# 2. Project Philosophy

PhoneCam should follow one fundamental philosophy:

> **Just connect your phone and use it as a webcam.**

The user should NOT have to:

1. Create an account.
2. Purchase a license.
3. Pay a subscription.
4. Watch advertisements.
5. Accept a watermark.
6. Install unnecessary software.
7. Upload video to the Internet.
8. Create an account on an external server.
9. Manually configure ports.
10. Understand networking concepts just to use the application.

All technical complexity should be hidden behind a simple user experience.

---

# 3. Target User Experience

The ideal experience should look like this:

```text
                    PC
                     │
                     │
              Open PhoneCam
                     │
                     ▼
               ┌───────────┐
               │     QR    │
               └─────┬─────┘
                     │
                     │
                Scan QR Code
                     │
                     ▼
                  PHONE
                     │
              Camera permission
                     │
                     ▼
              Camera connected
                     │
                     ▼
                    PC
                     │
                     ▼
             "PhoneCam Camera"
                     │
             ┌───────┼────────┐
             ▼       ▼        ▼
           Zoom    Discord    OBS
```

The final goal is for the operating system to recognize PhoneCam as a normal webcam.

For example:

```text
Camera:
    PhoneCam Camera
```

Any application that supports standard webcams should be able to use it.

---

# 4. General Architecture

The initial architecture must be local-first.

The primary communication path should be:

```text
Smartphone
    │
    │ Wi-Fi / Local Network
    │
    ▼
PhoneCam Desktop
    │
    ▼
Virtual Camera
    │
    ├── Discord
    ├── Zoom
    ├── Google Meet
    ├── Microsoft Teams
    ├── OBS
    └── Other webcam-compatible applications
```

The video stream must not require a remote server.

---

# 5. Technology Stack

## Desktop Application

The desktop application should use:

* Tauri.
* Rust.
* TypeScript.
* React.
* Tailwind CSS.

Tauri will primarily handle the desktop application shell and UI.

Rust will handle:

* System-level operations.
* Networking.
* Video-related processing.
* Virtual camera integration.
* Platform-specific functionality.
* Performance-sensitive components.

---

# 6. Local Backend

The local backend should be written in Rust.

Preferred technologies:

* Tokio.
* Axum.
* WebSocket.
* WebRTC where appropriate.

The backend is responsible for:

* Device pairing.
* WebRTC signaling.
* Communication with the mobile client.
* Connection management.
* Session management.
* Streaming-related logic.
* Virtual camera integration.
* Operating-system integration.

---

# 7. Video Transport

The primary video transport technology should be:

## WebRTC

WebRTC is preferred because it provides:

* Low latency.
* Real-time video.
* Adaptive bitrate.
* Network handling.
* Audio support.
* Mature browser APIs.
* Encryption through the WebRTC stack.

The initial implementation should use WebRTC over the local network.

Do not build a custom video transport protocol if WebRTC can solve the problem properly.

---

# 8. Initial Mobile Client

The first version does NOT necessarily require a native mobile application.

The MVP should preferably use a local web application.

The smartphone could connect through:

```text
Chrome / Safari
        │
        ▼
PhoneCam Web Page
        │
        ▼
getUserMedia()
        │
        ▼
WebRTC
        │
        ▼
PC
```

This allows us to validate:

* Camera access.
* Video streaming.
* Pairing.
* Latency.
* Resolution.
* FPS.
* Connection stability.

before investing time into native Android/iOS applications.

---

# 9. QR Pairing

One of the primary features should be QR-based pairing.

When the user opens PhoneCam on the PC:

```text
┌───────────────────────────────┐
│                               │
│          PhoneCam             │
│                               │
│      Scan this QR code        │
│                               │
│          ████████             │
│          ██ QR ██             │
│          ████████             │
│                               │
│      Waiting for phone...     │
│                               │
└───────────────────────────────┘
```

The QR code should contain enough information to initiate the connection.

It must NOT contain:

* Permanent passwords.
* Permanent credentials.
* Unnecessary personal information.
* Long-lived reusable authentication tokens.

Session identifiers should be temporary whenever possible.

---

# 10. Security

The application must assume that the local network may not be completely trusted.

Therefore:

* Pairing must be explicit.
* Sessions should use temporary identifiers.
* Connections should be terminable by the user.
* Permanent credentials should be avoided.
* Video must not be transmitted to remote servers.
* The user should be able to see which device is connected.

When possible, the transport should rely on WebRTC's built-in security mechanisms.

---

# 11. Privacy

Privacy is a fundamental project principle.

PhoneCam must follow these rules:

### The video belongs to the user.

The application must not upload the camera feed to external servers by default.

### No mandatory account.

Users must be able to use PhoneCam without registering.

### No invasive telemetry.

PhoneCam must not collect:

* Video.
* Audio.
* Images.
* Camera history.
* Personal information.

If optional diagnostic telemetry is ever added, it must be:

* Disabled by default.
* Clearly documented.
* Easy to disable.
* Never associated with captured media.

---

# 12. Virtual Camera

One of the main technical goals is to expose the phone's video as a virtual webcam.

The operating system should recognize something like:

```text
Windows Camera Settings

Camera:
    PhoneCam Camera
```

The architecture should be:

```text
Phone
  │
  │ WebRTC
  ▼
PhoneCam Desktop
  │
  │ Video Frames
  ▼
Virtual Camera Driver / Native API
  │
  ▼
Operating System
  │
  ├── Discord
  ├── Zoom
  ├── Teams
  ├── OBS
  └── Browser
```

The implementation will vary by operating system.

---

# 13. Operating System Support

The project should be designed with cross-platform support in mind.

## First priority: Windows

Windows should be the first officially supported platform.

The virtual webcam is one of the most important components, and it is preferable to solve the complete problem on one operating system before expanding.

## Second priority: Linux

## Third priority: macOS

Do not sacrifice a clean architecture just to support every platform from day one.

Platform-specific code should remain isolated.

For example:

```text
virtual-camera/
├── windows/
├── linux/
└── macos/
```

Shared logic should not be filled with platform checks everywhere.

Prefer well-defined platform abstractions.

---

# 14. Resolution

The initial application should support:

* 640x480.
* 1280x720.
* 1920x1080.

4K is not required for the MVP.

Resolution should be negotiated according to the capabilities of the phone and the connection.

Stability and latency are more important than maximum resolution.

---

# 15. Frame Rate

Initial targets:

* 24 FPS.
* 30 FPS.
* 60 FPS when supported.

The application must not force 60 FPS if doing so causes:

* Excessive battery usage.
* Overheating.
* Frame drops.
* High latency.

---

# 16. Latency

Latency should be treated as an important performance metric.

Approximate LAN targets:

```text
Ideal:
< 100 ms

Acceptable:
100–200 ms

Problematic:
> 300 ms
```

Do not optimize prematurely for a specific number.

The priority should be:

1. Stable connection.
2. Smooth video.
3. Low latency.
4. Image quality.

---

# 17. Audio

Audio is NOT required for the first MVP.

However, the architecture should allow it to be added later.

Future architecture:

```text
Phone Microphone
       │
       ▼
     WebRTC
       │
       ▼
       PC
       │
       ▼
PhoneCam Microphone
```

This could allow the phone to function as both:

* Webcam.
* Microphone.

Do not delay the MVP for audio support.

---

# 18. Camera Controls

After the MVP, the application may support:

* Front/rear camera switching.
* Flash.
* Zoom.
* Focus.
* Exposure.
* Resolution.
* FPS.
* Orientation.
* Mirror mode.
* Rotation.

Controls should only be shown when the hardware supports them.

Do not expose controls that have no effect.

---

# 19. User Interface

The UI should be extremely simple.

Avoid creating a configuration-heavy application.

Initial screen:

```text
┌───────────────────────────────┐
│                               │
│          PhoneCam             │
│                               │
│       Your phone will         │
│       become your webcam.     │
│                               │
│          [ QR ]               │
│                               │
│       Waiting for phone...    │
│                               │
└───────────────────────────────┘
```

After connecting:

```text
┌───────────────────────────────┐
│ PhoneCam                      │
│                               │
│       ┌─────────────┐         │
│       │             │         │
│       │   PREVIEW   │         │
│       │             │         │
│       └─────────────┘         │
│                               │
│ ● Connected                   │
│                               │
│ Resolution: 1080p             │
│ FPS: 30                       │
│                               │
│        [ Disconnect ]          │
└───────────────────────────────┘
```

Avoid unnecessary settings.

---

# 20. Visual Design

The design should be:

* Minimal.
* Modern.
* Clean.
* Fast.
* Accessible.
* Uncluttered.

It should not look like old enterprise software.

It should also not blindly copy existing webcam applications.

PhoneCam should have its own visual identity.

---

# 21. No Watermark

PhoneCam must NEVER add a watermark to the video.

There must never be text such as:

```text
PhoneCam
```

overlaid on the camera feed.

There must never be an option like:

```text
Remove watermark — Premium
```

The camera output should be the actual camera image.

---

# 22. No Premium Tier

There must be no Premium version.

There must be no:

```text
Free
Pro
Premium
Enterprise
```

tier system that artificially locks features.

If a feature is implemented, it should be available to users.

---

# 23. No Advertising

PhoneCam must not contain advertising.

Do not implement:

* Banner advertisements.
* Popup advertisements.
* Mobile ads.
* Ads during connection.
* Ads inside the video stream.

---

# 24. No Account

Users should never be required to create an account.

The ideal flow is:

```text
Install
→ Open
→ Scan QR
→ Use camera
```

Nothing else.

---

# 25. No Cloud Dependency

The main functionality must be local.

Users should be able to use PhoneCam even when Internet access is unavailable.

Conceptually:

```text
Internet:     ❌
Local Wi-Fi:  ✅
PhoneCam:     ✅
```

Internet access may eventually be used for:

* Checking for updates.
* Downloading new releases.
* Documentation.

But Internet access must never be required to transport the video.

---

# 26. Offline Operation

The preferred architecture is:

```text
PC ───────── Local Wi-Fi ───────── Phone
```

rather than:

```text
PC → Internet → Server → Internet → Phone
```

This reduces:

* Latency.
* Costs.
* Dependencies.
* Privacy risks.
* Operational complexity.

---

# 27. Device Discovery

Initially, QR pairing is the primary discovery mechanism.

Future possibilities include:

* mDNS.
* Bonjour.
* SSDP.
* Local broadcast.

Do not complicate the MVP with automatic discovery unless necessary.

---

# 28. USB Support

USB support may be added later.

Possible architecture:

```text
Phone
  │
  │ USB
  ▼
PC
  │
  ▼
PhoneCam
  │
  ▼
Virtual Camera
```

Potential benefits:

* Lower latency.
* No Wi-Fi dependency.
* Better stability.
* Simultaneous phone charging.

USB is NOT required for the MVP.

---

# 29. Repository Structure

The repository should remain modular.

Suggested structure:

```text
phonecam/
│
├── apps/
│   │
│   ├── desktop/
│   │   ├── src/
│   │   ├── src-tauri/
│   │   └── package.json
│   │
│   └── mobile-web/
│       ├── src/
│       └── package.json
│
├── crates/
│   │
│   ├── signaling/
│   ├── streaming/
│   ├── protocol/
│   └── virtual-camera/
│
├── docs/
│   ├── architecture.md
│   ├── protocol.md
│   └── development.md
│
├── scripts/
│
├── tests/
│
├── README.md
├── LICENSE
└── GEMINI.md
```

This structure may change if there is a clear technical reason.

Do not reorganize the project purely for stylistic preferences.

---

# 30. Code Quality

Code should prioritize:

* Clarity.
* Maintainability.
* Security.
* Modularity.
* Reasonable performance.

Avoid:

* Unnecessary abstractions.
* Unnecessary dependencies.
* Duplicated code.
* Magic numbers.
* Giant functions.
* Unnecessary global state.

Complex components should be isolated into dedicated modules.

---

# 31. Dependencies

Before adding a dependency, ask:

1. Is it actually necessary?
2. Is there a standard-library alternative?
3. Is it actively maintained?
4. Is its license compatible?
5. Does it significantly increase application size?
6. Does it introduce telemetry?
7. Does it introduce an unnecessary external service?

PhoneCam should not become a project with hundreds of unnecessary dependencies.

---

# 32. License

The project is intended to be free and open-source software.

The target license is:

**GNU GPLv3**

The license may be reconsidered before the first stable release, but any change must be an explicit project decision.

All third-party code and dependencies must be reviewed for license compatibility.

---

# 33. Do Not Reinvent Mature Technologies

Do not implement complex technologies from scratch when mature solutions already exist.

Examples:

Do not implement our own:

* Video codec.
* Transport protocol.
* Encryption system.
* Full WebRTC implementation.

Use established technologies whenever possible.

---

# 34. MVP

The MVP must remain small.

### MVP goal

Allow:

```text
PC
 ↓
Show QR code
 ↓
Phone scans QR
 ↓
Phone requests camera permission
 ↓
WebRTC
 ↓
PC receives video
 ↓
PC displays preview
```

That is enough for the first functional version.

The MVP does NOT need:

* Audio.
* USB.
* 4K.
* Advanced zoom.
* Remote controls.
* Recording.
* Internet streaming.
* Accounts.
* Cloud services.
* Native mobile apps.

---

# 35. Phase 2

Once video streaming works reliably:

* Virtual camera.
* Windows installer.
* Resolution selection.
* FPS selection.
* Automatic reconnection.
* Better error handling.

Primary goal:

```text
PhoneCam Camera
```

appears as a standard webcam in Windows.

---

# 36. Phase 3

Additional features:

* Audio.
* Front/rear camera switching.
* Flash.
* Zoom.
* Exposure controls.
* Improved preview.
* Connection statistics.
* Linux support.
* macOS support.

---

# 37. Phase 4

Native mobile applications:

* Android.
* iOS.

The web client should remain an option when it provides a sufficiently good experience.

Native applications should not become mandatory if a browser can provide the same functionality effectively.

---

# 38. Error Handling

Errors should be understandable to normal users.

Avoid displaying messages like:

```text
Error: ICE candidate gathering failed, code 0xA42F...
```

to the user.

Instead:

```text
We couldn't connect to your phone.

Make sure both devices are connected
to the same Wi-Fi network.
```

Technical details may be available through diagnostic logs.

---

# 39. Logging

The project should have a structured logging system for development and diagnostics.

Logs should help diagnose:

* Pairing.
* WebRTC.
* Connections.
* Frame drops.
* Camera errors.
* Virtual camera errors.
* Reconnection problems.

Logs must not unnecessarily store sensitive information.

Never log:

* Video frames.
* Photos.
* Audio.
* Passwords.
* Complete authentication tokens.

---

# 40. Performance

PhoneCam should aim to consume minimal resources.

Goals:

* Low CPU usage.
* Low memory usage.
* No unnecessary background processes.
* No active connections when the camera is not being used.
* Avoid unnecessary frame copies.

Avoid premature optimization.

First:

```text
Correctness
```

Then:

```text
Performance
```

---

# 41. Smartphone Battery

The phone will perform a relatively intensive task.

Future optimizations should consider:

* Dynamic FPS.
* Dynamic resolution.
* Bitrate control.
* Battery indicators.
* Thermal considerations.

These are not MVP requirements, but the architecture should allow them.

---

# 42. Orientation

The application must properly handle:

* Portrait.
* Landscape.

The camera feed must not be stretched.

The correct aspect ratio must be preserved.

---

# 43. Image Quality

The system should avoid unnecessarily degrading the camera feed.

Preferred pipeline:

```text
Camera
 ↓
Codec
 ↓
WebRTC
 ↓
Virtual Camera
```

Avoid unnecessary transformations or copies.

---

# 44. External Application Compatibility

The final goal is compatibility with standard webcam applications.

Examples:

* OBS Studio.
* Discord.
* Zoom.
* Microsoft Teams.
* Google Meet.
* Web browsers.
* Video conferencing applications.

Do not implement custom integrations for each application.

The virtual camera should behave like a standard webcam.

---

# 45. Testing

The project should include automated tests wherever practical.

Especially:

* Protocol validation.
* Pairing.
* Message validation.
* Session management.
* Reconnection.
* Rust components.

Manual testing should eventually cover:

* Android.
* iOS.
* Windows.
* Linux.
* macOS.

as those platforms become supported.

---

# 46. Git Practices

Commits should be small and descriptive.

Good examples:

```text
feat: add QR pairing
feat: add WebRTC signaling
feat: add camera preview
feat: add virtual camera abstraction
fix: reconnect after WiFi interruption
fix: preserve video aspect ratio
```

Avoid commits such as:

```text
stuff
changes
final
final2
test
```

---

# 47. Incremental Development

Do not attempt to implement the entire project at once.

Recommended order:

```text
1. Desktop shell
        ↓
2. Local server
        ↓
3. QR generation
        ↓
4. Mobile web page
        ↓
5. Camera access
        ↓
6. WebRTC signaling
        ↓
7. WebRTC video
        ↓
8. Desktop preview
        ↓
9. Reconnection
        ↓
10. Virtual camera
        ↓
11. Packaging
        ↓
12. Polish
```

Each stage should be independently testable.

---

# 48. Important Rule for Gemini

When working on this project:

> Do not add features simply because they are technically possible.

Before implementing something, ask:

* Does it help the primary goal?
* Does it make the application simpler?
* Does it reduce friction?
* Does it improve reliability?
* Is it necessary for the MVP?

If the answer is no, it should probably wait.

---

# 49. What We DO NOT Want to Build

PhoneCam must NOT become:

* A streaming platform.
* A social network.
* A cloud service.
* A SaaS product.
* A subscription service.
* An advertising platform.
* A product with artificial feature restrictions.
* A service that requires an Internet connection.
* A system that collects unnecessary data.

The project must remain focused:

> **Turn a phone into a webcam.**

---

# 50. Definition of Success

PhoneCam will be considered successful when a user can:

```text
1. Install PhoneCam on the PC.

2. Open it.

3. See a QR code.

4. Scan the QR code with their phone.

5. Grant camera permission.

6. See the phone's camera on the PC.

7. Select "PhoneCam Camera"
   in an application such as OBS,
   Discord, or Zoom.

8. Use it.
```

Without:

* An account.
* Payment.
* A watermark.
* Advertisements.
* Cloud services.
* Complicated configuration.

---

# 51. Development Priorities

When choosing between different technical solutions, use this priority order:

1. Simplicity for the user.
2. Privacy.
3. Reliability.
4. Compatibility.
5. Low latency.
6. Image quality.
7. Performance.
8. Maintainability.
9. Number of features.

Never sacrifice the first priorities merely to add more features.

---

# 52. Initial Project Status

Current status:

```text
[ ] Define initial architecture
[ ] Create repository
[ ] Create Tauri application
[ ] Create Rust backend
[ ] Create mobile web client
[ ] Implement QR generation
[ ] Implement signaling
[ ] Implement WebRTC
[ ] Display video on desktop
[ ] Implement virtual camera
[ ] Create installer
[ ] Documentation
[ ] Tests
[ ] First release
```

The first concrete milestone is:

> **Get real-time video from the smartphone camera to the desktop application's preview using only the local network.**

Once this works reliably, continue with the virtual camera.

---

# 53. Golden Rule

## Keep it simple.

PhoneCam does not need to be the application with the most features.

It needs to be the application that does one thing extremely well:

> **Use your phone as a webcam.**

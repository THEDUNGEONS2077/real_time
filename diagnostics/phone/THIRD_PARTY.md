# Third-party components

The helper contains no advertising or analytics SDK. These libraries support local authentication, certificates and offline trace analysis:

| Component | Pin | Upstream and license |
|---|---|---|
| libadb-android | 3.1.1, tag commit c849886ebc6d48e7b46d967e78a6bb65c90c3b74 | https://github.com/MuntashirAkon/libadb-android/tree/3.1.1 — Apache-2.0 option, with BSD-3-Clause portions by Cameron Gutman |
| spake2-android | 2.2.1 | https://github.com/MuntashirAkon/spake2-java/tree/2.2.1 — LGPL-3.0 and upstream cryptographic notices |
| Conscrypt | 2.5.3 | https://github.com/google/conscrypt — Apache-2.0; includes BoringSSL notices |
| Bouncy Castle | 1.79 | https://www.bouncycastle.org/licence.html — Bouncy Castle license |
| Perfetto processor | v53.0 | https://github.com/google/perfetto — Apache-2.0 and bundled third-party components |
| AndroidX annotations | 1.9.1 | https://android.googlesource.com/platform/frameworks/support/ — Apache-2.0 |
| Kotlin standard library | 1.9.24 | https://github.com/JetBrains/kotlin — Apache-2.0 |

TimedPairing.java is a bounded transport adapter to Android's ADB pairing protocol. It uses libadb's existing PAKE implementation and the Apache-2.0 license option. Original library notices remain in the upstream dependencies. Packaged library license resources remain included in the APK.

Full dependency license texts accompany the app under assets/licenses. Source for the unmodified LGPL SPAKE2 component is available at the exact tag above. This repository includes the helper's source and build instructions so it can be rebuilt against a compatible replacement of that dependency; the release build deliberately does not obfuscate or restrict such replacement.

The official processor pin is taken from https://github.com/google/perfetto/blob/v54.0/tools/trace_processor. The Android ARM64 executable has SHA-256 `ef7118426cc3ea0a0402c6c6978708ab8717b8df7d5ca1e6ec64ae72cde8a4ed`; build and release tooling preserve and verify it byte for byte.

// Build setup: one resource-only application per independent face.
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google(); mavenCentral()
        // Only the pinned pairing library comes from JitPack.
        exclusiveContent {
            forRepository { maven { url = uri("https://jitpack.io") } }
            filter {
                includeModule("com.github.MuntashirAkon", "libadb-android")
                includeModule("com.github.MuntashirAkon.spake2-java", "spake2-android")
            }
        }
    }
}
rootProject.name = "real_time"
include(":faces:halo")
include(":faces:redline")
include(":faces:cipher")
include(":faces:nexus")
include(":diagnostics:phone")

// Packaging layer: NEXUS contains resources only. Signing secrets stay local.
import java.util.Properties
plugins { id("com.android.application") }
val releaseKey = Properties().apply {
    val propertiesFile = rootProject.file("keystore.properties")
    if (propertiesFile.exists()) propertiesFile.inputStream().use { load(it) }
}
android {
    namespace = "com.thedungeons2077.realtime.nexus"
    compileSdk = 36
    buildToolsVersion = "36.0.0"
    defaultConfig {
        applicationId = "com.thedungeons2077.realtime.nexus"
        minSdk = 36
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }
    buildFeatures { buildConfig = false }
    lint {
        // WFF resolves bare resource names at runtime; Android lint cannot follow them.
        disable += "UnusedResources"
        // These versions are deliberately pinned to the agreed API-36 toolchain.
        disable += "AndroidGradlePluginVersion"
    }
    signingConfigs {
        if (releaseKey.isNotEmpty()) create("release") {
            storeFile = rootProject.file(releaseKey.getProperty("storeFile"))
            storePassword = releaseKey.getProperty("storePassword")
            keyAlias = releaseKey.getProperty("keyAlias")
            keyPassword = releaseKey.getProperty("keyPassword")
        }
    }
    buildTypes {
        debug {
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-dev"
            // There is no application code to attach a debugger to; diagnostics target the system renderer.
            isDebuggable = false
            // AGP creates R classes even without source code. R8 removes those unused classes.
            isMinifyEnabled = true
            isShrinkResources = false
        }
        release {
            // Remove AGP's generated R bytecode, while retaining all runtime-named WFF resources.
            isMinifyEnabled = true
            isShrinkResources = false
            if (releaseKey.isNotEmpty()) signingConfig = signingConfigs.getByName("release")
        }
    }
}

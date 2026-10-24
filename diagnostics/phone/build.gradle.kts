// Phone packaging: the diagnostics client is a separate APK, never part of a WFF face.
import java.util.Properties
import org.gradle.api.tasks.testing.Test
plugins { id("com.android.application") }
val key = Properties().apply { rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) } }
val processor = rootProject.file(".tools/perfetto-android-v53.0/trace_processor_shell")
val prepareProcessor by tasks.registering(Copy::class) {
    // Android permits execution from the installed native-library directory, not writable app data.
    from(processor)
    into(layout.buildDirectory.dir("generated/jniLibs/arm64-v8a"))
    rename { "libtrace_processor.so" }
    doFirst { check(processor.isFile) { "Run bash scripts/setup-phone-tools.sh first." } }
}
val prepareCollector by tasks.registering(Copy::class) {
    // Phone and command-line users run precisely the same capture protocol.
    from(rootProject.file("tools/measure/capture.sh"))
    from(rootProject.file("diagnostics/phone/THIRD_PARTY.md")) { rename { "third-party.txt" } }
    into(layout.buildDirectory.dir("generated/assets"))
}
android {
    namespace = "com.thedungeons2077.realtime.diagnostics"
    compileSdk = 36
    buildToolsVersion = "36.0.0"
    defaultConfig {
        applicationId = "com.thedungeons2077.realtime.diagnostics"
        minSdk = 33
        targetSdk = 36
        versionCode = 3
        versionName = "0.2.1"
        buildConfigField("String", "SOURCE_COMMIT", "\"${providers.exec { commandLine("git", "rev-parse", "HEAD") }.standardOutput.asText.get().trim()}\"")
        buildConfigField("String", "FACE_CERT_SHA256", "\"${rootProject.file("signing-certificate.sha256").readText().trim()}\"")
        ndk { abiFilters += "arm64-v8a" }
    }
    buildFeatures { buildConfig = true }
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/assets"))
    sourceSets["main"].jniLibs.srcDir(layout.buildDirectory.dir("generated/jniLibs"))
    // Extract the official processor to an executable, read-only installed-library location.
    packaging { jniLibs { useLegacyPackaging = true; keepDebugSymbols += "**/libtrace_processor.so" } }
    signingConfigs { if (key.isNotEmpty()) create("release") {
        storeFile = rootProject.file(key.getProperty("storeFile"))
        storePassword = key.getProperty("storePassword")
        keyAlias = key.getProperty("keyAlias")
        keyPassword = key.getProperty("keyPassword")
    } }
    buildTypes {
        debug { applicationIdSuffix = ".dev" }
        release { if (key.isNotEmpty()) signingConfig = signingConfigs.getByName("release") }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    lint { disable += "AndroidGradlePluginVersion" }
}
tasks.named("preBuild") { dependsOn(prepareProcessor, prepareCollector) }
// Test the packaged resource table and ZIP, including AAPT2's renamed paths, rather than source paths.
tasks.withType<Test>().configureEach {
    dependsOn(":faces:halo:assembleDebug")
    val fixture = providers.gradleProperty("haloSelectionFixture").orElse(rootProject.file("faces/halo/build/outputs/apk/debug/halo-debug.apk").absolutePath)
    inputs.file(fixture)
    systemProperty("halo.selection.fixture", fixture.get())
    systemProperty("halo.selection.aapt2", File(android.sdkDirectory, "build-tools/36.0.0/aapt2").absolutePath)
}
dependencies {
    implementation("com.github.MuntashirAkon:libadb-android:3.1.1") {
        // Use one Bouncy Castle family; mixing the old/new artifacts duplicates classes.
        exclude(group = "org.bouncycastle", module = "bcprov-jdk15to18")
    }
    implementation("org.conscrypt:conscrypt-android:2.5.3")
    implementation("org.bouncycastle:bcpkix-jdk18on:1.79")
    testImplementation("junit:junit:4.13.2")
}

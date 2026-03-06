# Supabase
-keep class io.supabase.** { *; }
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Flutter
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Kotlin
-keep class kotlin.** { *; }
-dontwarn kotlin.**

# OkHttp (used by Supabase)
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

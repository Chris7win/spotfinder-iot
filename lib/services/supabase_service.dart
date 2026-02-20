import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/booking.dart';
import '../models/parking_slot.dart';
import '../models/user_model.dart';

class SupabaseService {
  final _client = Supabase.instance.client;

  // ── Auth ──────────────────────────────────────────────────────────────

  SupabaseClient get client => _client;
  User? get currentUser => _client.auth.currentUser;
  String? get currentUserId => _client.auth.currentUser?.id;
  bool get isEmailVerified =>
      _client.auth.currentUser?.emailConfirmedAt != null;

  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  Future<AuthResponse> signIn(String email, String password) async {
    return await _client.auth
        .signInWithPassword(email: email, password: password);
  }

  Future<AuthResponse> signUp(
      String email, String password, String fullName) async {
    return await _client.auth.signUp(
      email: email,
      password: password,
      data: {'full_name': fullName},
    );
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  Future<void> resetPassword(String email) async {
    await _client.auth.resetPasswordForEmail(email);
  }

  Future<void> resendVerificationEmail(String email) async {
    await _client.auth.resend(type: OtpType.signup, email: email);
  }

  /// Returns null on success, or the error message on failure.
  Future<String?> verifyPassword(String password) async {
    try {
      final email = currentUser?.email;
      if (email == null) {
        return 'No email found for current user';
      }
      debugPrint('SupabaseService.verifyPassword: Verifying for $email');
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      if (response.user != null) {
        debugPrint('SupabaseService.verifyPassword: Success');
        return null; // success
      }
      return 'Verification failed';
    } catch (e) {
      debugPrint('SupabaseService.verifyPassword error: $e');
      return e.toString();
    }
  }

  // ── User Profile ──────────────────────────────────────────────────────

  Future<AppUser?> getUserProfile(String userId) async {
    try {
      final data =
          await _client.from('users').select().eq('id', userId).maybeSingle();
      if (data != null) {
        return AppUser.fromMap(data);
      }
      // Profile doesn't exist yet — auto-create from auth metadata
      return await _createProfileFromAuth(userId);
    } catch (e) {
      debugPrint('SupabaseService.getUserProfile error: $e');
      return null;
    }
  }

  Future<AppUser?> _createProfileFromAuth(String userId) async {
    try {
      final user = currentUser;
      if (user == null) return null;

      final fullName = user.userMetadata?['full_name'] as String? ?? 'User';
      final profileData = {
        'id': userId,
        'email': user.email ?? '',
        'full_name': fullName,
        'created_at': DateTime.now().toIso8601String(),
      };

      await _client.from('users').upsert(profileData);
      return AppUser.fromMap(profileData);
    } catch (e) {
      debugPrint('SupabaseService._createProfileFromAuth error: $e');
      return null;
    }
  }

  Future<bool> updateUserProfile(
      String userId, Map<String, dynamic> updates) async {
    try {
      await _client.from('users').update(updates).eq('id', userId);
      return true;
    } catch (e) {
      debugPrint('SupabaseService.updateUserProfile error: $e');
      return false;
    }
  }

  // ── Parking Slots ─────────────────────────────────────────────────────

  Future<List<ParkingSlot>> getActiveSlots() async {
    try {
      debugPrint('SupabaseService: Fetching active slots...');
      final data = await _client
          .from('slot_status')
          .select()
          .eq('is_active', true)
          .order('slot_number');
      debugPrint('SupabaseService: Got ${data.length} active slots');
      if (data.isNotEmpty) {
        return data.map((e) => ParkingSlot.fromMap(e)).toList();
      }
    } catch (e) {
      debugPrint('SupabaseService.getActiveSlots error: $e');
      // Try fallback without is_active filter
      try {
        final data = await _client
            .from('slot_status')
            .select()
            .order('slot_number')
            .limit(4);
        if (data.isNotEmpty) {
          return data.map((e) => ParkingSlot.fromMap(e)).toList();
        }
      } catch (e2) {
        debugPrint('SupabaseService.getActiveSlots fallback error: $e2');
      }
    }

    // Try to seed the database first
    final seeded = await _seedDefaultSlots();
    if (seeded.isNotEmpty) return seeded;

    // Ultimate fallback: return local in-memory slots
    debugPrint('SupabaseService: Using local fallback slots');
    return _localFallbackSlots();
  }

  List<ParkingSlot> _localFallbackSlots() {
    return List.generate(
      4,
      (i) => ParkingSlot(
        slotNumber: i + 1,
        physicalStatus: 'free',
        displayStatus: 'FREE',
        lastUpdated: DateTime.now(),
        isActive: true,
      ),
    );
  }

  Future<List<ParkingSlot>> _seedDefaultSlots() async {
    debugPrint('SupabaseService: Attempting to seed default parking slots...');
    try {
      final slots = List.generate(
          4,
          (i) => {
                'slot_number': i + 1,
                'physical_status': 'free',
                'is_active': true,
                'last_updated': DateTime.now().toIso8601String(),
              });
      await _client.from('slot_status').upsert(slots);
      final data = await _client
          .from('slot_status')
          .select()
          .order('slot_number')
          .limit(4);
      debugPrint('SupabaseService: Seeded ${data.length} slots');
      return data.map((e) => ParkingSlot.fromMap(e)).toList();
    } catch (e) {
      debugPrint('SupabaseService._seedDefaultSlots error: $e');
      return [];
    }
  }

  // ── Bookings ──────────────────────────────────────────────────────────

  Future<Booking?> createBooking(Map<String, dynamic> bookingData) async {
    final data =
        await _client.from('bookings').insert(bookingData).select().single();
    return Booking.fromMap(data);
  }

  Future<bool> updateBooking(
      String bookingId, Map<String, dynamic> updates) async {
    try {
      await _client.from('bookings').update(updates).eq('id', bookingId);
      return true;
    } catch (e) {
      debugPrint('SupabaseService.updateBooking error: $e');
      return false;
    }
  }

  Future<List<Booking>> getUserBookings(String userId) async {
    try {
      final data = await _client
          .from('bookings')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);
      return data.map((e) => Booking.fromMap(e)).toList();
    } catch (e) {
      debugPrint('SupabaseService.getUserBookings error: $e');
      return [];
    }
  }

  Future<Booking?> getBooking(String bookingId) async {
    try {
      final data =
          await _client.from('bookings').select().eq('id', bookingId).single();
      return Booking.fromMap(data);
    } catch (e) {
      debugPrint('SupabaseService.getBooking error: $e');
      return null;
    }
  }

  /// Checks if a slot is unavailable due to an existing booking or its 30-minute buffer.
  /// Logic: A conflict exists if (New_Start < Existing_End) AND (New_End > Existing_Start - 30m)
  Future<Booking?> getConflictingBooking(
      int slotNumber, DateTime start, DateTime end) async {
    try {
      final reqStartUtc = start.toUtc();
      final reqEndUtc = end.toUtc();

      // We fetch active/pending bookings for this slot
      final List<dynamic> data = await _client
          .from('bookings')
          .select()
          .eq('slot_number', slotNumber)
          .inFilter('status', ['pending', 'active']);

      for (var map in data) {
        final existing = Booking.fromMap(map);
        // Ensure we compare UTC to UTC
        final eStartUtc = existing.bookingStart.toUtc();
        final eEndUtc = existing.bookingEnd.toUtc();
        final eBufferStartUtc = eStartUtc.subtract(const Duration(minutes: 30));

        // Overlap Condition: (New_Start < Existing_End) AND (New_End > Existing_Buffer_Start)
        if (reqStartUtc.isBefore(eEndUtc) &&
            reqEndUtc.isAfter(eBufferStartUtc)) {
          debugPrint(
              'Conflict Detected: New[$reqStartUtc - $reqEndUtc] overlaps with Existing[$eBufferStartUtc - $eEndUtc]');
          return existing;
        }
      }
      return null;
    } catch (e) {
      debugPrint('SupabaseService.getConflictingBooking error: $e');
      return null;
    }
  }

  Future<Booking?> getActiveBookingForSlot(int slotNumber) async {
    try {
      final data = await _client
          .from('bookings')
          .select()
          .eq('slot_number', slotNumber)
          .inFilter('status', ['pending', 'active'])
          .limit(1)
          .maybeSingle();
      if (data == null) return null;
      return Booking.fromMap(data);
    } catch (e) {
      debugPrint('SupabaseService.getActiveBookingForSlot error: $e');
      return null;
    }
  }

  Future<List<Booking>> getAllActiveBookings() async {
    try {
      final data = await _client
          .from('bookings')
          .select()
          .inFilter('status', ['pending', 'active']);
      return data.map((e) => Booking.fromMap(e)).toList();
    } catch (e) {
      debugPrint('SupabaseService.getAllActiveBookings error: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> getBookingStats(String userId) async {
    try {
      final bookings =
          await _client.from('bookings').select().eq('user_id', userId);

      final total = bookings.length;
      final completed =
          bookings.where((b) => b['status'] == 'completed').length;
      double totalSpent = 0;
      for (final b in bookings) {
        if (b['payment_status'] == 'paid') {
          totalSpent += (b['payment_amount'] as num?)?.toDouble() ?? 0;
        }
      }

      return {
        'totalBookings': total,
        'completedBookings': completed,
        'totalSpent': totalSpent,
      };
    } catch (e) {
      debugPrint('SupabaseService.getBookingStats error: $e');
      return null;
    }
  }
}

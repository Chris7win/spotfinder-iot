import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_model.dart';
import '../services/supabase_service.dart';

class AuthProvider extends ChangeNotifier {
  final _supabase = SupabaseService();
  AppUser? _user;
  bool _isLoading = false;
  String? _error;
  bool _isAuthenticated = false;
  bool _isEmailVerified = false;
  StreamSubscription<AuthState>? _authSub;

  AppUser? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _isAuthenticated;
  bool get isEmailVerified => _isEmailVerified;
  String? get userId => _supabase.currentUserId;

  AuthProvider() {
    _authSub = _supabase.authStateChanges.listen(_onAuthStateChange);
    _checkCurrentSession();
  }

  void _checkCurrentSession() {
    final user = _supabase.currentUser;
    if (user != null) {
      _isAuthenticated = true;
      _isEmailVerified = user.emailConfirmedAt != null;
      _loadUserProfile(user.id);
    }
  }

  void _onAuthStateChange(AuthState state) {
    final session = state.session;
    if (session != null) {
      _isAuthenticated = true;
      _isEmailVerified = session.user.emailConfirmedAt != null;
      _loadUserProfile(session.user.id);
    } else {
      _isAuthenticated = false;
      _isEmailVerified = false;
      _user = null;
    }
    notifyListeners();
  }

  Future<void> _loadUserProfile(String userId) async {
    _user = await _supabase.getUserProfile(userId);
    notifyListeners();
  }

  Future<bool> signIn(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _supabase.signIn(email, password);
      if (response.user != null) {
        _isAuthenticated = true;
        _isEmailVerified = response.user!.emailConfirmedAt != null;
        if (_isEmailVerified) {
          await _loadUserProfile(response.user!.id);
        }
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _error = 'Sign in failed. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    } on AuthException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection failed. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> signUp(String email, String password, String fullName) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _supabase.signUp(email, password, fullName);
      if (response.user != null) {
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _error = 'Sign up failed. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    } on AuthException catch (e) {
      _error = e.message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = 'Connection failed. Please try again.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> resetPassword(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _supabase.resetPassword(email);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Failed to send reset email.';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> resendVerificationEmail(String email) async {
    try {
      await _supabase.resendVerificationEmail(email);
    } catch (e) {
      debugPrint('AuthProvider.resendVerification error: $e');
    }
  }

  Future<String?> verifyPassword(String password) async {
    return await _supabase.verifyPassword(password);
  }

  Future<bool> updateProfile({required String fullName, String? phone}) async {
    if (userId == null) return false;
    _isLoading = true;
    notifyListeners();

    final success = await _supabase.updateUserProfile(userId!, {
      'full_name': fullName,
      if (phone != null) 'phone': phone,
    });

    if (success) {
      await _loadUserProfile(userId!);
    }
    _isLoading = false;
    notifyListeners();
    return success;
  }

  Future<void> signOut() async {
    await _supabase.signOut();
    _user = null;
    _isAuthenticated = false;
    _isEmailVerified = false;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _authSub?.cancel();
    super.dispose();
  }
}

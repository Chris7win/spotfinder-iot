import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Background colors
  static const bgPrimary = Color(0xFF1E293B);
  static const bgSecondary = Color(0xFF334155);
  static const bgTertiary = Color(0xFF475569);

  // Brand colors (from logo)
  static const brandCyan = Color(0xFF00E5CC);
  static const brandGreen = Color(0xFF7CFC00);

  // Slot state colors — ONLY for slot status, never for buttons/nav
  static const slotAvailable = Color(0xFF10B981);
  static const slotOccupied = Color(0xFFEF4444);
  static const slotBooked = Color(0xFFF59E0B);
  static const slotUserActive = Color(0xFF8B5CF6);

  // System status
  static const statusOnline = Color(0xFF10B981);
  static const statusWarning = Color(0xFFF59E0B);
  static const statusOffline = Color(0xFFEF4444);

  // Action colors (NOT slot colors)
  static const actionPrimary = Color(0xFF00E5CC);
  static const actionSecondary = Color(0xFF64748B);
  static const actionDanger = Color(0xFFEF4444);
  static const actionSuccess = Color(0xFF10B981);

  // Typography
  static const textPrimary = Color(0xFFF1F5F9);
  static const textSecondary = Color(0xFFCBD5E1);
  static const textTertiary = Color(0xFF94A3B8);
  static const textDisabled = Color(0xFF64748B);

  // Borders
  static const border = Color(0xFF475569);
  static const borderLight = Color(0xFF64748B);
}

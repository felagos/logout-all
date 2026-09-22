import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EventSource, { type EventSourceListener } from 'react-native-sse';

import { useAuth } from '@/features/auth/AuthProvider';
import { authEventsUrl, fetchSessions, isAuthenticationError, logout, logoutAll, type Session } from '@/services/authApi';
import { colors, radii } from '@/theme';

type AuthEvent = 'logout-all';

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin información' : date.toLocaleString();
}

export function SessionsScreen() {
  const { session, signOut, status } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [endingAll, setEndingAll] = useState(false);

  const loadSessions = useCallback(async (isRefresh = false) => {
    if (!session) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      setSessions(await fetchSessions(session.token));
    } catch (cause) {
      if (isAuthenticationError(cause)) {
        await signOut();
        return;
      }
      setError(cause instanceof Error ? cause.message : 'No pudimos actualizar las sesiones.');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [session, signOut]);

  useEffect(() => {
    if (status === 'signedOut') {
      router.replace('/sign-in');
      return;
    }
    if (!session) return;
    const timer = setTimeout(() => void loadSessions(), 0);
    return () => clearTimeout(timer);
  }, [loadSessions, session, status]);

  useEffect(() => {
    if (!session) return;
    let source: EventSource<AuthEvent>;
    try {
      source = new EventSource<AuthEvent>(authEventsUrl(session.token), { pollingInterval: 5000 });
    } catch {
      return;
    }
    const handleLogoutAll: EventSourceListener<AuthEvent, 'logout-all'> = (event) => {
      let message = 'Se cerró tu sesión desde otro dispositivo.';
      try {
        const payload = JSON.parse(event.data ?? '{}') as { message?: unknown };
        if (typeof payload.message === 'string') message = payload.message;
      } catch {
        // The fallback keeps the logout flow safe if event data is malformed.
      }
      Alert.alert('Sesión cerrada', message);
      void signOut();
    };
    source.addEventListener('logout-all', handleLogoutAll);
    return () => {
      source.removeEventListener('logout-all', handleLogoutAll);
      source.close();
    };
  }, [session, signOut]);

  const handleLogoutAll = async () => {
    if (!session) return;
    setEndingAll(true);
    setError(null);
    try {
      await logoutAll(session.token);
      await signOut();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cerrar las sesiones.');
    } finally {
      setEndingAll(false);
    }
  };

  const confirmLogoutAll = () => {
    Alert.alert('¿Cerrar todas las sesiones?', 'También se cerrará esta sesión y todos los demás dispositivos perderán el acceso.', [
      { style: 'cancel', text: 'Cancelar' },
      { style: 'destructive', text: 'Cerrar todo', onPress: () => void handleLogoutAll() },
    ]);
  };

  const handleLogout = async () => {
    if (!session) return;
    try {
      await logout(session.token);
    } finally {
      await signOut();
    }
  };

  if (!session) {
    return <View style={styles.loadingScreen}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadSessions(true)} />}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brand}>Logout All</Text>
            <Text style={styles.userEmail}>{session.user.email}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void handleLogout()} style={styles.textButton}>
            <Text style={styles.textButtonLabel}>Salir</Text>
          </Pressable>
        </View>
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>SESIONES ACTIVAS</Text>
          <Text style={styles.title}>Hola, {session.user.name}.</Text>
          <Text style={styles.subtitle}>Todo el acceso a tu cuenta, en un solo lugar.</Text>
        </View>
        <View style={styles.summaryPanel}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.sessionCount}>{sessions.length}</Text>
              <Text style={styles.sessionCountLabel}>{sessions.length === 1 ? 'sesión activa' : 'sesiones activas'}</Text>
            </View>
            <Text style={styles.protectionLabel}>Cuenta protegida</Text>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => void loadSessions(true)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Actualizar</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={endingAll} onPress={confirmLogoutAll} style={({ pressed }) => [styles.dangerButton, (pressed || endingAll) && styles.buttonPressed]}>
              {endingAll ? <ActivityIndicator color={colors.card} /> : <Text style={styles.dangerButtonText}>Cerrar todo</Text>}
            </Pressable>
          </View>
        </View>
        {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} size="large" /></View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No hay sesiones activas</Text>
            <Text style={styles.emptyText}>Desliza hacia abajo para consultar cambios recientes.</Text>
          </View>
        ) : (
          <View style={styles.sessionList}>{sessions.map((activeSession) => <SessionCard key={activeSession.sessionId} session={activeSession} />)}</View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SessionCard({ session }: { session: Session }) {
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionCardHeader}>
        <Text style={styles.deviceName}>{session.deviceInfo}</Text>
        <Text style={styles.activeBadge}>Activa</Text>
      </View>
      <Detail label="Red" value={session.ipAddress} />
      <Detail label="Última actividad" value={formatDate(session.lastActivity)} />
      <Detail label="Inicio de sesión" value={formatDate(session.createdAt)} />
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { gap: 22, padding: 20, paddingBottom: 44 },
  loadingScreen: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  userEmail: { color: colors.textSubtle, fontSize: 13, marginTop: 3 },
  textButton: { borderRadius: radii.control, paddingHorizontal: 10, paddingVertical: 8 },
  textButtonLabel: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  heading: { gap: 7, marginTop: 12 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 31, fontWeight: '800', letterSpacing: -0.7, lineHeight: 37 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  summaryPanel: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.panel,
    borderWidth: 1,
    gap: 18,
    padding: 18,
    shadowColor: '#17345C',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  summaryHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  sessionCount: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -0.8, lineHeight: 38 },
  sessionCountLabel: { color: colors.muted, fontSize: 14, marginTop: 1 },
  protectionLabel: { backgroundColor: colors.primarySoft, borderRadius: radii.pill, color: colors.primary, fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  secondaryButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 11 },
  secondaryButtonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  dangerButton: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: radii.control, flex: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 11 },
  dangerButtonText: { color: colors.card, fontSize: 13, fontWeight: '800' },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radii.control, color: colors.danger, fontSize: 14, lineHeight: 20, padding: 13 },
  loading: { alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  emptyCard: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.panel, gap: 7, padding: 28 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  sessionList: { gap: 12 },
  sessionCard: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radii.panel, borderWidth: 1, gap: 15, padding: 18 },
  sessionCardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  deviceName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  activeBadge: { backgroundColor: colors.successSoft, borderRadius: radii.pill, color: colors.success, fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  detail: { gap: 3 },
  detailLabel: { color: colors.textSubtle, fontSize: 12, fontWeight: '700' },
  detailValue: { color: colors.text, fontSize: 14 },
});

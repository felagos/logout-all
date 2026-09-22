import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { login, register } from '@/services/authApi';
import { colors, radii } from '@/theme';

import { useAuth } from './AuthProvider';

type AuthScreenProps = { mode: 'signIn' | 'register' };

export function AuthScreen({ mode }: AuthScreenProps) {
  const isRegistering = mode === 'register';
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password || (isRegistering && !name.trim())) {
      setError('Completa todos los campos requeridos.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const session = isRegistering
        ? await register({ email: email.trim(), name: name.trim(), password })
        : await login({ email: email.trim(), password });
      await signIn(session);
      router.replace('/sessions');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.brandRow}>
              <View style={styles.mark}><Text style={styles.markText}>LA</Text></View>
              <View>
                <Text style={styles.brand}>Logout All</Text>
                <Text style={styles.brandCaption}>Seguridad de cuenta</Text>
              </View>
            </View>
            <Text style={styles.eyebrow}>ACCESO SEGURO</Text>
            <Text style={styles.title}>{isRegistering ? 'Controla cada acceso.' : 'Tu cuenta, bajo control.'}</Text>
            <Text style={styles.subtitle}>
              {isRegistering
                ? 'Crea una cuenta para probar el cierre de sesión en todos tus dispositivos.'
                : 'Revisa las sesiones activas y cierra el acceso cuando lo necesites.'}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.formHeading}>
              <Text style={styles.formTitle}>{isRegistering ? 'Crea tu cuenta' : 'Inicia sesión'}</Text>
              <Text style={styles.formHint}>Usa tus credenciales para continuar.</Text>
            </View>
            {isRegistering && <Field label="Nombre" value={name} onChangeText={setName} autoCapitalize="words" />}
            <Field
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              secureTextEntry
            />
            {error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void submit()}
              style={({ pressed }) => [styles.primaryButton, (pressed || submitting) && styles.buttonPressed]}>
              {submitting
                ? <ActivityIndicator color={colors.card} />
                : <Text style={styles.primaryButtonText}>{isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}</Text>}
            </Pressable>
            <Text style={styles.securityNote}>Tus credenciales nunca se guardan. La sesión se protege en este dispositivo.</Text>
          </View>

          <Text style={styles.switchText}>
            {isRegistering ? '¿Ya tienes una cuenta? ' : '¿Aún no tienes cuenta? '}
            <Link href={isRegistering ? '/sign-in' : '/register'} style={styles.switchLink}>
              {isRegistering ? 'Inicia sesión' : 'Regístrate'}
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'email' | 'new-password' | 'current-password';
  keyboardType?: 'email-address';
  secureTextEntry?: boolean;
};

function Field({ label, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        autoCorrect={false}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 28 },
  hero: { marginBottom: 28 },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 11, marginBottom: 30 },
  mark: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.control, height: 44, justifyContent: 'center', width: 44 },
  markText: { color: colors.card, fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },
  brand: { color: colors.text, fontSize: 15, fontWeight: '800' },
  brandCaption: { color: colors.textSubtle, fontSize: 12, marginTop: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 9 },
  title: { color: colors.text, fontSize: 31, fontWeight: '800', letterSpacing: -0.7, lineHeight: 37, marginBottom: 9 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, maxWidth: 325 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.panel,
    borderWidth: 1,
    gap: 18,
    padding: 20,
    shadowColor: '#17345C',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  formHeading: { gap: 3, marginBottom: 2 },
  formTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  formHint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  field: { gap: 8 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.control,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radii.control, color: colors.danger, fontSize: 14, lineHeight: 20, padding: 12 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.control, justifyContent: 'center', minHeight: 52, paddingHorizontal: 16 },
  primaryButtonText: { color: colors.card, fontSize: 16, fontWeight: '800' },
  buttonPressed: { backgroundColor: colors.primaryPressed, opacity: 0.92, transform: [{ scale: 0.985 }] },
  securityNote: { color: colors.textSubtle, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  switchText: { color: colors.muted, fontSize: 14, marginTop: 22, textAlign: 'center' },
  switchLink: { color: colors.primary, fontWeight: '800' },
});

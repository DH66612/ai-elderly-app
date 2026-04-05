import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 0,
      paddingTop: Spacing["10xl"],
      paddingBottom: Spacing["5xl"],
    },
    header: {
      marginBottom: Spacing["6xl"],
      alignItems: 'center',
    },
    logo: {
      fontSize: 64,
      marginBottom: Spacing.lg,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      marginBottom: Spacing.sm,
    },
    subtitle: {
      fontSize: 16,
    },
    form: {
      gap: Spacing.lg,
    },
    label: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: Spacing.sm,
    },
    input: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 18,
      borderWidth: 1,
      borderColor: theme.border,
    },
    roleSelector: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginBottom: Spacing.md,
    },
    roleButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      gap: Spacing.sm,
    },
    roleButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    roleButtonInactive: {
      backgroundColor: theme.backgroundTertiary,
      borderColor: theme.borderLight,
    },
    roleButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      marginTop: Spacing.xl,
    },
    buttonText: {
      color: theme.buttonPrimaryText,
      fontSize: 18,
      fontWeight: '600',
    },
    footer: {
      marginTop: Spacing["2xl"],
      alignItems: 'center',
    },
    footerText: {
      fontSize: 16,
    },
    link: {
      color: theme.primary,
      fontWeight: '600',
    },
  });
};

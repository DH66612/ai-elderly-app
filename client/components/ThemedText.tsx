import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography as TypographyType } from '@/constants/theme';

type TypographyVariant = keyof typeof TypographyType.guardian;

interface ThemedTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export function ThemedText({
  variant = 'body',
  color,
  style,
  children,
  ...props
}: ThemedTextProps) {
  const { typography } = useTheme();
  const typographyStyle = typography[variant as keyof typeof typography] || typography.body;

  const textStyle: TextStyle = {
    ...typographyStyle,
    color: color,
  };

  return (
    <Text style={[textStyle, style]} {...props}>
      {children}
    </Text>
  );
}

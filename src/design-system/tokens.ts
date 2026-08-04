export const frakonTokens = {
  radius: { sm: '12px', md: '20px', lg: '28px' },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
  motion: { fast: '160ms', normal: '260ms' },
  surface: {
    dark: 'rgba(18, 22, 30, 0.78)',
    light: 'rgba(255, 255, 255, 0.82)',
  },
} as const;

export const baseStyles = `
  :host {
    --frakon-radius-card: 24px;
    --frakon-surface: color-mix(in srgb, var(--card-background-color, #171b24) 88%, transparent);
    --frakon-border: color-mix(in srgb, var(--primary-text-color, white) 12%, transparent);
    --frakon-accent: var(--primary-color, #6aa8ff);
    display: block;
    font-family: var(--paper-font-body1_-_font-family, Inter, system-ui, sans-serif);
  }
`;

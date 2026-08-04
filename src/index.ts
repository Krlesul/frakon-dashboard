import './cards/frakon-card';

interface CustomCardRegistration {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
}

declare global {
  interface Window { customCards?: CustomCardRegistration[]; }
}

window.customCards = window.customCards ?? [];
window.customCards.push({
  type: 'frakon-card',
  name: 'FRAKON Card',
  description: 'Premium multilingual entity card by FRAKON.',
  preview: true,
});

console.info('%c FRAKON Dashboard %c 0.1.0-alpha.1 ', 'background:#10141c;color:#fff;padding:4px 8px;border-radius:6px 0 0 6px', 'background:#6aa8ff;color:#07101d;padding:4px 8px;border-radius:0 6px 6px 0');

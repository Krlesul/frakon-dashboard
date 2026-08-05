import './cards/frakon-card';
import './cards/light/light-card';
import './cards/light/light-card-editor';
import './cards/sensor/sensor-card';
import './cards/cover/cover-card';
import './cards/climate/climate-card';
import './cards/room/room-card';
import './cards/camera/camera-card';
import './cards/media/media-player-card';
import './cards/vehicle/vehicle-card';
import './dashboard/dashboard-card';
import './dashboard/dashboard-card-editor';

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
window.customCards.push(
  { type: 'frakon-card', name: 'FRAKON Card', description: 'Premium multilingual entity card by FRAKON.', preview: true },
  { type: 'frakon-light-card', name: 'FRAKON Light Card', description: 'Premium light control with brightness and visual editor.', preview: true },
  { type: 'frakon-sensor-card', name: 'FRAKON Sensor Card', description: 'Premium multilingual measurement and status card.', preview: true },
  { type: 'frakon-cover-card', name: 'FRAKON Cover Card', description: 'Premium cover control with position feedback.', preview: true },
  { type: 'frakon-climate-card', name: 'FRAKON Climate Card', description: 'Premium climate control with current and target temperature.', preview: true },
  { type: 'frakon-room-card', name: 'FRAKON Room Card', description: 'Room overview with climate and grouped lights.', preview: true },
  { type: 'frakon-camera-card', name: 'FRAKON Camera Card', description: 'Camera preview with status overlay.', preview: true },
  { type: 'frakon-media-player-card', name: 'FRAKON Media Player Card', description: 'Media playback and volume controls.', preview: true },
  { type: 'frakon-vehicle-card', name: 'FRAKON Vehicle Card', description: 'Vehicle battery, range and charging overview.', preview: true },
  { type: 'frakon-dashboard-card', name: 'FRAKON Dashboard Card', description: 'Responsive collision-safe grid with nested cards, history and transfer.', preview: true },
);

console.info('%c FRAKON Dashboard %c 0.10.0-alpha.1 ', 'background:#10141c;color:#fff;padding:4px 8px;border-radius:6px 0 0 6px', 'background:#6aa8ff;color:#07101d;padding:4px 8px;border-radius:0 6px 6px 0');

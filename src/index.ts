import './cards/frakon-card';
import './cards/light/light-card';
import './cards/light/light-card-editor';
import './cards/sensor/sensor-card';
import './cards/binary-sensor/binary-sensor-card';
import './cards/action/action-card';
import './cards/fan/fan-card';
import './cards/cover/cover-card';
import './cards/climate/climate-card';
import './cards/room/room-card';
import './cards/camera/camera-card';
import './cards/media/media-player-card';
import './cards/vehicle/vehicle-card';
import './cards/energy/energy-card';
import './cards/switch/switch-card';
import './cards/lock/lock-card';
import './dashboard/dashboard-card';
import './dashboard/dashboard-card-editor';
import './dashboard/canvas-dashboard-card';
import './dashboard/responsive-v2-save-panel';
import './dashboard/responsive-v2-conflict-panel';
import './dashboard/responsive-v2-health-panel';
import './dashboard/responsive-v2-persistence-action-panel';

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
  { type: 'frakon-binary-sensor-card', name: 'FRAKON Binary Sensor Card', description: 'Door, window, motion, smoke, moisture and safety state card.', preview: true },
  { type: 'frakon-action-card', name: 'FRAKON Action Card', description: 'Press a button, run a script or activate a scene.', preview: true },
  { type: 'frakon-fan-card', name: 'FRAKON Fan Card', description: 'Fan power and percentage speed control.', preview: true },
  { type: 'frakon-cover-card', name: 'FRAKON Cover Card', description: 'Premium cover control with position feedback.', preview: true },
  { type: 'frakon-climate-card', name: 'FRAKON Climate Card', description: 'Premium climate control with current and target temperature.', preview: true },
  { type: 'frakon-room-card', name: 'FRAKON Room Card', description: 'Room overview with climate and grouped lights.', preview: true },
  { type: 'frakon-camera-card', name: 'FRAKON Camera Card', description: 'Camera preview with status overlay.', preview: true },
  { type: 'frakon-media-player-card', name: 'FRAKON Media Player Card', description: 'Media playback and volume controls.', preview: true },
  { type: 'frakon-vehicle-card', name: 'FRAKON Vehicle Card', description: 'Vehicle battery, range and charging overview.', preview: true },
  { type: 'frakon-energy-card', name: 'FRAKON Energy Card', description: 'Power, energy and price overview for Home Assistant.', preview: true },
  { type: 'frakon-switch-card', name: 'FRAKON Switch Card', description: 'Direct Home Assistant switch control.', preview: true },
  { type: 'frakon-lock-card', name: 'FRAKON Lock Card', description: 'Lock and unlock control with state feedback.', preview: true },
  { type: 'frakon-dashboard-card', name: 'FRAKON Dashboard Card', description: 'Responsive visual editor with palette, forms, history and configurable persistence.', preview: true },
  { type: 'frakon-canvas-dashboard-card', name: 'FRAKON Canvas Dashboard (Experimental)', description: 'Experimental free-pixel canvas editor with collision-safe v1-compatible commits.', preview: true },
);

console.info('%c FRAKON Dashboard %c 0.16.0-alpha.1 ', 'background:#10141c;color:#fff;padding:4px 8px;border-radius:6px 0 0 6px', 'background:#6aa8ff;color:#07101d;padding:4px 8px;border-radius:0 6px 6px 0');

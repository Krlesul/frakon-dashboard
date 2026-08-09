export type FrakonCardCategory = 'general' | 'lighting' | 'climate' | 'security' | 'media' | 'energy' | 'vehicle';

export interface FrakonCardTemplate {
  type: string;
  name: string;
  description: string;
  category: FrakonCardCategory;
  defaultWidth: number;
  defaultHeight: number;
  createConfig(entity?: string): Record<string, unknown>;
}

export const frakonCardCatalog: readonly FrakonCardTemplate[] = [
  { type:'custom:frakon-card', name:'Entity', description:'Universal entity status and action card.', category:'general', defaultWidth:3, defaultHeight:3, createConfig:(entity='sensor.placeholder')=>({ type:'custom:frakon-card', entity }) },
  { type:'custom:frakon-sensor-card', name:'Sensor', description:'Measurement and status display.', category:'general', defaultWidth:3, defaultHeight:3, createConfig:(entity='sensor.placeholder')=>({ type:'custom:frakon-sensor-card', entity }) },
  { type:'custom:frakon-room-card', name:'Room', description:'Room overview with climate and grouped lights.', category:'general', defaultWidth:4, defaultHeight:4, createConfig:(entity='sensor.placeholder')=>({ type:'custom:frakon-room-card', entity, light_entities:[] }) },
  { type:'custom:frakon-light-card', name:'Light', description:'Light control with brightness.', category:'lighting', defaultWidth:3, defaultHeight:4, createConfig:(entity='light.placeholder')=>({ type:'custom:frakon-light-card', entity, show_brightness:true, show_color_temperature:true }) },
  { type:'custom:frakon-climate-card', name:'Climate', description:'Current and target temperature control.', category:'climate', defaultWidth:4, defaultHeight:4, createConfig:(entity='climate.placeholder')=>({ type:'custom:frakon-climate-card', entity, step:0.5 }) },
  { type:'custom:frakon-cover-card', name:'Cover', description:'Blind, shutter, garage or gate control.', category:'security', defaultWidth:4, defaultHeight:4, createConfig:(entity='cover.placeholder')=>({ type:'custom:frakon-cover-card', entity, show_position:true }) },
  { type:'custom:frakon-camera-card', name:'Camera', description:'Live camera preview with status overlay.', category:'security', defaultWidth:6, defaultHeight:5, createConfig:(entity='camera.placeholder')=>({ type:'custom:frakon-camera-card', entity, aspect_ratio:'16 / 9', show_state:true }) },
  { type:'custom:frakon-media-player-card', name:'Media player', description:'Playback and volume controls.', category:'media', defaultWidth:4, defaultHeight:4, createConfig:(entity='media_player.placeholder')=>({ type:'custom:frakon-media-player-card', entity, show_volume:true }) },
  { type:'custom:frakon-energy-card', name:'Energy', description:'Power, energy and price overview.', category:'energy', defaultWidth:4, defaultHeight:4, createConfig:(entity='sensor.power')=>({ type:'custom:frakon-energy-card', entity }) },
  { type:'custom:frakon-vehicle-card', name:'Vehicle', description:'Battery, range and charging overview.', category:'vehicle', defaultWidth:4, defaultHeight:4, createConfig:(entity='sensor.vehicle_battery')=>({ type:'custom:frakon-vehicle-card', entity }) },
] as const;

export function filterCardCatalog(query: string, category?: FrakonCardCategory | 'all'): FrakonCardTemplate[] {
  const normalized = query.trim().toLocaleLowerCase();
  return frakonCardCatalog.filter((template) => {
    if (category && category !== 'all' && template.category !== category) return false;
    if (!normalized) return true;
    return `${template.name} ${template.description} ${template.type} ${template.category}`.toLocaleLowerCase().includes(normalized);
  });
}

import { installStudioLocalization } from './studio-localization';
import './studio-app-v2';

installStudioLocalization();

if (!window.document.querySelector('frakon-studio-app-v2')) {
  window.document.body.append(window.document.createElement('frakon-studio-app-v2'));
}

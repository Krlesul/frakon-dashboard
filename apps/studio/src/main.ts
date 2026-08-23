import { installStudioLocalization } from './studio-localization';

installStudioLocalization();

void import('./studio-app-v2').then(() => {
  if (!window.document.querySelector('frakon-studio-app-v2')) {
    window.document.body.append(window.document.createElement('frakon-studio-app-v2'));
  }
});

import './studio-app';

if (!window.document.querySelector('frakon-studio-app')) {
  window.document.body.append(window.document.createElement('frakon-studio-app'));
}

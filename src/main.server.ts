import { bootstrapApplication } from '@angular/platform-browser';
import { mergeApplicationConfig } from '@angular/core';

import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';
import { appConfigServer } from './app/app.config.server';

export default function bootstrap(context: any) {
  return bootstrapApplication(
    AppComponent,
    mergeApplicationConfig(appConfig, appConfigServer),
    context
  );
}

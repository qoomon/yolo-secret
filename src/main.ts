import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'
import { createVuetify } from 'vuetify'

// @ts-ignore
import colors from "vuetify/lib/util/colors";
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.min.css'
import 'vuetify/styles'

const app = createApp(App);

app.use(createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/pages/SecretAddPage.vue'),
    },
    {
      path: '/:id',
      component: () => import('@/pages/SecretGetPage.vue'),
    },
    { path: '/:path(.*)', redirect: '/' }
  ],
}));

app.use(createVuetify({
  components,
  directives,
  theme: {
    themes: {
      light: {
        dark: false,
        colors: {
          primary: colors.blue.darken1,
          secondary: colors.blue.lighten1,
        }
      },
      dark: {
        dark: true,
        colors: {
          primary: colors.blue.darken2,
          secondary: colors.blue.base,
        }
      }
    },
  },
}));

app.mount('#app');

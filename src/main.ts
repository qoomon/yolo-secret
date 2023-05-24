
import './assets/main.css'
import {createApp} from 'vue'
// @ts-ignore
import App from './App.vue'
// @ts-ignore
import {createVuetify} from 'vuetify'
// @ts-ignore
import colors from 'vuetify/lib/util/colors'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.min.css'
import 'vuetify/styles'

const vuetify = createVuetify({
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
})

createApp(App)
    .use(vuetify)
    .mount('#app')

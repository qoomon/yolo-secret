import './assets/main.css'
import {createApp} from 'vue'
import App from './App.vue'
import {createVuetify} from 'vuetify'
import '@mdi/font/css/materialdesignicons.min.css'
import 'vuetify/styles'
import colors from 'vuetify/lib/util/colors'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

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

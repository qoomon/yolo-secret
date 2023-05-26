<script setup lang="ts" xmlns="http://www.w3.org/1999/html">

import {ref, watchEffect} from "vue";
import {useTheme} from 'vuetify'

// ----------------------------------------------------------------------------

const theme = useTheme()
theme.global.name.value = localStorage.getItem('theme') || 'light'

function toggleTheme() {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
    localStorage.setItem('theme', theme.global.name.value)
}
</script>

<template>
    <v-app>
        <header>
            <v-container style="width: 100%; max-width: 464px; padding-top: 2em;">
                <router-link to="/">
                    <div style="display: flex; align-items: center;">
                        <img src="@/assets/app.png" alt="YOLO Secret App Icon"
                             style="height: 2.5em; margin-right: 0.5em;">
                        <h2 class="text-center" style="opacity: 0.6;">YOLO Secret</h2>
                    </div>
                </router-link>
                <v-divider :thickness="2" style="margin-top: 0.2em;"></v-divider>
            </v-container>
        </header>

        <main>
            <router-view/>
        </main>

        <footer style="position: absolute; bottom: 0;  min-width: 100vw;">
            <v-container style="display: flex; justify-content: space-between;">
                <v-btn
                        href="https://github.com/qoomon/yolo-secret"
                        density="compact"
                        variant="text"
                        color="grey"
                        icon="mdi-github"
                ></v-btn>
                <v-btn
                        @click="toggleTheme"
                        density="compact"
                        variant="text"
                        color="grey"
                        :icon="theme.global.current.value.dark ? 'mdi-lightbulb-on' : 'mdi-lightbulb-off'"
                ></v-btn>
            </v-container>
        </footer>
    </v-app>
</template>

<style>

</style>

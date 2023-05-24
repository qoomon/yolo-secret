<script setup lang="ts" xmlns="http://www.w3.org/1999/html">

import {ref, watchEffect} from "vue";
import axios from "axios"
import {useTheme} from 'vuetify'
import SecretAddForm from "@/components/SecretAddForm.vue";
import SecretUrlView from "@/components/SecretUrlView.vue";
import SecretRevealView from "@/components/SecretRevealView.vue";
import SecretView from "@/components/SecretView.vue";


// ----------------------------------------------------------------------------

const theme = useTheme()
theme.global.name.value = localStorage.getItem('theme') || 'light'

function toggleTheme() {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
    localStorage.setItem('theme', theme.global.name.value)
}

const snackbar = ref({
    active: false,
    color: 'success' as 'success' | 'error' | 'info' | 'warning',
    message: null as string | null,
});

const secretToken = ref<string | undefined>(window.location.hash.substring(1));
addEventListener("hashchange", () => {
    secretToken.value = window.location.hash.substring(1);
    addSecretResponseModel.value = undefined;
});
watchEffect(() => {
    if (!secretToken.value) window.location.hash = '';
});

const secretMetaData = ref<{
    status: 'UNREAD' | 'READ' | 'TOO_MANY_PASSPHRASE_ATTEMPTS' | 'DELETED',
    expiresAt: number,
    passphrase?: boolean
} | undefined>();

watchEffect(async () => {
    if (!secretToken.value) return;
    await getSecretMetaData()
});

async function getSecretMetaData() {
    try {
        secretMetaData.value = await axios
            .get(`/api/secrets/${secretToken.value}/meta`)
            .then((response) => response.data)
    } catch (e) {
        if (e.response.status === 404) {
            snackbar.value = {
                active: true,
                color: 'warning',
                message: 'Secret not found!',
            };
        } else {
            console.error(e)
            snackbar.value = {
                active: true,
                color: 'warning',
                message: 'Failed to Get Secret' + (e.response?.data?.error ? `: ${e.response.data.error}` : ''),
            };
        }
    }
}

// ----------------------------------------------------------------------------
// --- Create Secret ---
// ----------------------------------------------------------------------------


const addSecretRequestModel = ref<{
    type: 'text' | 'file',
    data?: string,
    name?: string,
    ttl?: string,
    passphrase?: string,
}>({type: 'text'});


const addSecretResponseModel = ref<{
    token: string,
    htmlUrl: string,
} | undefined>
();

async function addSecret() {
    try {
        addSecretResponseModel.value = await axios
            .post('/api/secrets', addSecretRequestModel.value)
            .then((response) => response.data)
        // clear secret data
        addSecretRequestModel.value = {type: 'text'};
    } catch (e) {
        console.error(e)
        snackbar.value = {
            active: true,
            color: 'error',
            message: 'Failed to Create Secret' + (e.response?.data?.error ? `: ${e.response.data.error}` : ''),
        };
    }
}

// ----------------------------------------------------------------------------
// --- Reveal Secret ---
// ----------------------------------------------------------------------------
const getSecretRequestModel = ref<{
    passphrase?: string,
}>({});

const getSecretResponseModel = ref<{
    type: 'text' | 'file',
    data: string,
    name?: string,
} | undefined>();

async function getSecretData() {
    try {
        getSecretResponseModel.value = await axios
            .get(`/api/secrets/${secretToken.value}`, {
                params: {
                    passphrase: getSecretRequestModel.value.passphrase,
                }
            })
            .then((response) => response.data);
        // clear secret data
        getSecretRequestModel.value = {};
    } catch (e) {
        if (e.response.status === 404) {
            snackbar.value = {
                active: true,
                color: 'warning',
                message: 'Unknown Secret or Wrong Password',
            };
        } else if (e.response.status === 410) {
            snackbar.value = {
                active: true,
                color: 'error',
                message: 'Secret has been read already!',
            };
        } else {
            console.error(e)
            snackbar.value = {
                active: true,
                color: 'error',
                message: 'Failed to Get Secret' + (e.response?.data?.error ? `: ${e.response.data.error}` : ''),
            };
        }
    }
}

// ----------------------------------------------------------------------------
// --- Utils ---
// ----------------------------------------------------------------------------


</script>

<template>
    <v-app>
        <v-container style="width: 100%; max-width: 464px; padding-top: 2em;">
            <a href="/">
                <div style="display: flex; align-items: center;">
                    <img
                            alt="YOLO Secret App Icon"
                            src="@/assets/app.png"
                            style="height: 2.5em; margin-right: 0.5em;"
                    >
                    <h2 class="text-center" style="opacity: 0.6;">YOLO Secret</h2>
                </div>
            </a>
            <v-divider :thickness="2" style="margin-top: 0.2em;"></v-divider>
        </v-container>

        <v-container style="width: 100%; max-width: 440px">
            <v-card class="mx-auto">
                <v-container>
                    <template v-if="!secretToken">
                        <secret-add-form
                                v-if="!addSecretResponseModel"
                                v-model="addSecretRequestModel"
                                @submit="addSecret"/>
                        <secret-url-view
                                v-else
                                :url="addSecretResponseModel.htmlUrl"
                                @dismiss="addSecretResponseModel = undefined;"/>
                    </template>

                    <template v-else>
                        <secret-reveal-view
                                v-if="!getSecretResponseModel"
                                v-model="getSecretRequestModel"
                                :meta-data="secretMetaData"
                                @reveal="getSecretData"
                        />
                        <secret-view
                                v-else
                                :secret="getSecretResponseModel"
                                @dismiss="getSecretResponseModel = undefined; secretToken = undefined"
                        />
                    </template>
                </v-container>
            </v-card>
        </v-container>

        <v-container
                style="display: flex;justify-content: space-between; position: absolute; bottom: 0;  min-width: 100vw;">
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

        <v-snackbar v-model="snackbar.active" variant="elevated" :color="snackbar.color">
            <div class="text-center" style="font-weight: bold">{{ snackbar.message }}</div>
        </v-snackbar>
    </v-app>
</template>

<style>

</style>

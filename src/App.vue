<script setup lang="ts" xmlns="http://www.w3.org/1999/html">

import {ref, watchEffect} from "vue";
import axios from "axios"
import {useTheme} from 'vuetify'

// TODO remove passphrase option
// TODO add tombstone indicator
// TODO add better error messages e.g. token or passphrase wrong

const ttlSelectionItems: { title: string, value: number, default?: boolean }[] = [
    {title: '5 Minutes', value: 60 * 5},
    {title: '30 Minutes', value: 60 * 30},
    {title: '1 Hour', value: 60 * 60},
    {title: '4 Hours', value: 60 * 60 * 4},
    {title: '12 Hours', value: 60 * 60 * 12},
    {title: '1 Day', value: 60 * 60 * 24},
    {title: '3 Days', value: 60 * 60 * 24 * 3},
    {title: '7 Days', value: 60 * 60 * 24 * 7, default: true},
    {title: '14 Days', value: 60 * 60 * 24 * 14},
];

// ----------------------------------------------------------------------------

const theme = useTheme()
theme.global.name.value = localStorage.getItem('theme') || 'light'

function toggleTheme() {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
    localStorage.setItem('theme', theme.global.name.value)
}

const snackbar = ref({
    active: false,
    color: 'success' as 'success' | 'error',
    message: null as string | null,
});

const locationHash = ref(window.location.hash.substring(1) as string | null)
addEventListener("hashchange", () => {
    locationHash.value = window.location.hash.substring(1);
    creatSecretResponseModel.value = {token: null, htmlUrl: null};
    secretDataVisibility.value = false;
})
watchEffect(() => {
    if (!locationHash.value) window.location.hash = '';
})

// ----------------------------------------------------------------------------
// --- Create Secret ---
// ----------------------------------------------------------------------------
const creatSecretFileInput = ref()

const secretDataVisibility = ref(false)

function toggleSecretDataVisibility() {
    secretDataVisibility.value = !secretDataVisibility.value
}

const creatSecretRequestModel = ref({
    type: 'text' as ('text' | 'file'),
    name: null as string | null,
    data: null as string | null,
    ttl: ttlSelectionItems.find((item) => item.default)?.value,
    passphrase: null as string | null,
});

async function creatSecretRequestModel_setFile(file) {
    if (file) {
        creatSecretRequestModel.value.type = 'file';
        creatSecretRequestModel.value.data = await readAsDataURL(file);
        creatSecretRequestModel.value.name = file.name;
    } else {
        creatSecretRequestModel.value.type = 'text';
        creatSecretRequestModel.value.data = null;
    }
}

const creatSecretResponseModel = ref({
    token: null as string | null,
    htmlUrl: null as string | null,
});

async function createSecret() {
    try {
        creatSecretResponseModel.value = await axios
            .post('/api/secrets', creatSecretRequestModel.value)
            .then((response) => response.data)
        // clear secret data
        creatSecretRequestModel.value = {
            type: 'text' as 'text' | 'file',
            name: null,
            data: null,
            ttl: ttlSelectionItems.find((item) => item.default)?.value,
            passphrase: null,
        };
    } catch (e) {
        console.log(e)
        snackbar.value = {
            active: true,
            color: 'error',
            message: 'Failed to create secret',
        };
    }
}

// ----------------------------------------------------------------------------
// --- Reveal Secret ---
// ----------------------------------------------------------------------------
const getSecretRequestModel = ref({
    passphrase: null,
});
const getSecretResponseModel = ref({
    type: 'file' as 'text' | 'file',
    data: null as string | null,
    name: null as string | null,
});

async function getSecret() {
    try {
        getSecretResponseModel.value = await axios
            .get('/api/secrets/' + location.hash.substring(1), {
                params: {
                    passphrase: getSecretRequestModel.value.passphrase,
                }
            })
            .then((response) => response.data);
        // clear secret data
        getSecretRequestModel.value = {
            passphrase: null,
        };
    } catch (e) {
        console.log(e)
        snackbar.value = {
            active: true,
            color: 'error',
            message: 'Failed to get secret',
        };
    }
}

// ----------------------------------------------------------------------------
// --- Utils ---
// ----------------------------------------------------------------------------

async function readAsDataURL(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (e) => {
            reader.abort();
            reject(e);
        }
    });
}

function downloadUrl(href, download) {
    const a = document.createElement('a')
    a.href = href
    a.download = download;
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

function copyToClipboard(name: string, text: string | null) {
    navigator.clipboard.writeText(text || '').then(() => {
        snackbar.value = {
            active: true,
            color: 'success',
            message: `Copied ${name} to clipboard`
        };
    }, () => {
        snackbar.value = {
            active: true,
            color: 'error',
            message: 'Failed to copy to clipboard',
        };
    });
}
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
                    <!--Create Secret View-->
                    <template v-if="!locationHash">
                        <template v-if="!creatSecretResponseModel.token">
                            <v-form @submit.prevent="createSecret">
                                <!-- Secret Text -->
                                <v-textarea
                                        name="data"
                                        v-if="creatSecretRequestModel.type === 'text'"
                                        v-model="creatSecretRequestModel.data"
                                        label="Secret Value"
                                        variant="outlined"
                                        color="primary"
                                        auto-grow
                                        max-rows="16"
                                        rows="4"
                                        autofocus
                                        spellcheck="false"
                                        :class="{'text-masking': !secretDataVisibility}"
                                >
                                    <template v-slot:append-inner>
                                        <v-icon
                                                v-if="creatSecretRequestModel.data"
                                                color="primary"
                                                :icon="!secretDataVisibility ? 'mdi-eye' : 'mdi-eye-off'"
                                                @click="toggleSecretDataVisibility()"
                                        ></v-icon>
                                        <v-icon
                                                v-else
                                                color="primary"
                                                icon="mdi-attachment"
                                                @click="creatSecretFileInput.click()"
                                        ></v-icon>
                                    </template>
                                </v-textarea>

                                <!-- Secret File -->
                                <v-file-input
                                        name="data"
                                        v-show="creatSecretRequestModel.type === 'file'"
                                        ref="creatSecretFileInput"
                                        label="Secret File"
                                        variant="outlined"
                                        color="primary"
                                        prepend-icon=""
                                        @update:model-value="async (files) => creatSecretRequestModel_setFile(files[0])"
                                ></v-file-input>

                                <v-select
                                        name="ttl"
                                        v-model="creatSecretRequestModel.ttl"
                                        :items="ttlSelectionItems"
                                        label="Expiration"
                                        variant="outlined"
                                        color="primary"
                                        density="comfortable"
                                ></v-select>

                                <v-text-field
                                        name="passphrase"
                                        v-model="creatSecretRequestModel.passphrase"
                                        type="password"
                                        autocomplete="new-password"
                                        label="Passphrase (optional)"
                                        variant="underlined"
                                        color="primary"
                                        density="compact"
                                        spellcheck="false"
                                ></v-text-field>

                                <v-btn
                                        type="submit"
                                        color="primary"
                                        variant="elevated"
                                        text="Create Secret"
                                        :disabled="!creatSecretRequestModel.data"
                                ></v-btn>
                            </v-form>
                        </template>
                        <template v-else>
                            <v-text-field
                                    :model-value="creatSecretResponseModel.htmlUrl"
                                    readonly
                                    label="Secret URL"
                                    variant="outlined"
                                    color="primary"
                            >
                                <template v-slot:append-inner>
                                    <v-icon
                                            color="primary"
                                            icon="mdi-clipboard-text"
                                            @click="copyToClipboard('Secret URL', creatSecretResponseModel.htmlUrl);"
                                    ></v-icon>
                                </template>
                            </v-text-field>

                            <v-btn
                                    color="primary"
                                    variant="elevated"
                                    text="Dismiss"
                                    @click="creatSecretResponseModel = { token: null, htmlUrl: null}"
                            ></v-btn>
                        </template>
                    </template>

                    <!--Reveal Secret View-->
                    <template v-else>
                        <template v-if="!getSecretResponseModel.data">
                            <v-form @submit.prevent="getSecret">
                                <v-text-field
                                        name="passphrase"
                                        v-model="getSecretRequestModel.passphrase"
                                        type="password"
                                        autocomplete="off"
                                        label="Passphrase (optional)"
                                        variant="underlined"
                                        color="primary"
                                        density="compact"
                                        spellcheck="false"
                                ></v-text-field>

                                <v-btn
                                        type="submit"
                                        color="primary"
                                        variant="elevated"
                                        text="Reveal Secret"
                                        @click:.once="getSecret()"
                                ></v-btn>
                            </v-form>
                        </template>
                        <template v-else>
                            <!-- Secret File Download -->
                            <v-text-field
                                    v-if="getSecretResponseModel.type === 'file'"
                                    :model-value="getSecretResponseModel.name"
                                    readonly
                                    label="Secret File"
                                    variant="outlined"
                                    color="primary"
                            >
                                <template v-slot:append-inner>
                                    <v-icon
                                            color="primary"
                                            icon="mdi-download"
                                            @click="downloadUrl(getSecretResponseModel.data, getSecretResponseModel.name)"
                                    ></v-icon>
                                </template>
                            </v-text-field>

                            <!-- Secret Text Display -->
                            <v-textarea
                                    v-else
                                    v-model="getSecretResponseModel.data"
                                    readonly
                                    label="Secret Value"
                                    variant="outlined"
                                    color="primary"
                                    max-rows="16"
                                    rows="4"
                                    auto-grow="auto-grow"
                                    :class="{'text-masking': !secretDataVisibility}"
                            >
                                <template v-slot:append-inner>
                                    <div
                                            style="
                                                height: 100%;
                                                display: flex; flex-wrap: wrap; align-content: space-between;
                                                padding-bottom: var(--v-input-padding-top, 10px);
                                            "
                                    >
                                        <v-icon
                                                color="primary"
                                                :icon="!secretDataVisibility ? 'mdi-eye' : 'mdi-eye-off'"
                                                @click="toggleSecretDataVisibility()"
                                        ></v-icon>
                                        <v-icon
                                                color="primary"
                                                icon="mdi-clipboard-text"
                                                @click="copyToClipboard('Secret Value', getSecretResponseModel.data);"
                                        ></v-icon>
                                    </div>
                                </template>
                            </v-textarea>

                            <v-btn
                                    text="Dismiss"
                                    color="primary"
                                    variant="elevated"
                                    @click="getSecretResponseModel = { type: 'text', data: null, name: null }; locationHash = null;"
                            ></v-btn>
                        </template>
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
.v-textarea--auto-grow .v-field__input {
    overflow-y: scroll;
    -ms-overflow-style: none; /* Internet Explorer 10+ */
    scrollbar-width: none; /* Firefox */
}

.v-textarea--auto-grow .v-field__input::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
}

.v-text-field.text-masking .v-field__input {
    font-family: 'Flow Block', cursive;
    filter: opacity(0.8);
}

input[type="password"] {
    font-family: Flow Block, cursive;
}
</style>

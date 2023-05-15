<script setup lang="ts" xmlns="http://www.w3.org/1999/html">

import {ref, watchEffect} from "vue";
import axios from "axios"
import {useTheme} from 'vuetify'

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
    message: null as string | null,
});

const token = ref(window.location.hash.substring(1) as string | null)
addEventListener("hashchange", () => {
    token.value = window.location.hash.substring(1);
    creatSecretResponseModel.value = {
        token: null,
        htmlUrl: null,
    };
})
watchEffect(() => {
    if (!token.value) {
        window.location.hash = ''
    }
})

// ----------------------------------------------------------------------------
// --- Create Secret ---
// ----------------------------------------------------------------------------
const creatSecretFileInput = ref()

const creatSecretRequestModel = ref({
    value: null as string | null,
    type: 'text' as 'text' | 'file',
    ttl: ttlSelectionItems.find((item) => item.default)?.value,
    passphrase: null as string | null,
});
const creatSecretResponseModel = ref({
    token: null as string | null,
    htmlUrl: null as string | null,
});

async function createSecret() {
    try {
        creatSecretResponseModel.value = await axios
            .post('/api/secret', creatSecretRequestModel.value)
            .then((response) => response.data)
    } catch (e) {
        console.log(e)
        snackbar.value = {
            active: true,
            message: 'Failed to create secret',
        };
    } finally {
        creatSecretRequestModel.value = {
            value: null,
            type: 'text',
            ttl: creatSecretRequestModel.value.ttl,
            passphrase: null,
        };

    }

    creatSecretResponseModel.value.htmlUrl = window.location.origin + '/#' + creatSecretResponseModel.value.token
}

// ----------------------------------------------------------------------------
// --- Reveal Secret ---
// ----------------------------------------------------------------------------
const getSecretRequestModel = ref({
    passphrase: null,
});
const getSecretResponseModel = ref({
    value: null as string | null,
    type: 'file' as 'text' | 'file',
});

async function getSecret() {
    try {
        getSecretResponseModel.value = await axios
            .get('/api/secret', {
                params: {
                    token: location.hash.substring(1),
                    passphrase: getSecretRequestModel.value.passphrase,
                }
            })
            .then((response) => response.data);
    } catch (e) {
        console.log(e)
        snackbar.value = {
            active: true,
            message: 'Failed to get secret',
        };
        token.value = null
    } finally {
        getSecretRequestModel.value = {
            passphrase: null,
        };
    }
}

// ----------------------------------------------------------------------------
// --- Utils ---
// ----------------------------------------------------------------------------

async function readFileAsValue(file: File) {
    return `${file.name}|` + await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = (e) => {
            reader.abort();
            reject(e);
        }
    });
}

function downloadFileValue(fileValue) {
    const a = document.createElement('a')
    // FILENAME|DATA_URL
    const fileValueSplit = fileValue.split('|')
    a.download = fileValueSplit[0];
    a.href = fileValueSplit[1];
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

function copyToClipboard(name: string, text: string | null) {
    navigator.clipboard.writeText(text || '').then(() => {
        snackbar.value = {
            active: true,
            message: `Copied ${name} to clipboard`
        };
    }, () => {
        snackbar.value = {
            active: true,
            message: 'Failed to copy to clipboard',
        };
    });
}
</script>

<template>
    <v-app>
        <v-container style="width: 100%; max-width: 464px; padding-top: 2em;">
            <div style="display: flex; align-items: center;">
                <img
                        alt="YOLO Secret App Icon"
                        src="@/assets/app.png"
                        style="height: 2.5em; margin-right: 0.5em;"
                >
                <h2 class="text-center" style="opacity: 0.6;">YOLO Secret</h2>
            </div>
            <v-divider :thickness="2" style="margin-top: 0.2em;"></v-divider>
        </v-container>

        <v-container style="width: 100%; max-width: 440px">
            <v-card class="mx-auto">
                <v-container>
                    <!--Create Secret View-->
                    <template v-if="!token">
                        <template v-if="!creatSecretResponseModel.token">
                            <v-form @submit.prevent="createSecret">
                                <v-textarea
                                        v-if="creatSecretRequestModel.type === 'text'"
                                        v-model="creatSecretRequestModel.value"
                                        label="Secret Value"
                                        variant="outlined"
                                        color="primary"
                                        auto-grow="auto-grow"
                                        max-rows="16"
                                        rows="1"
                                        autofocus
                                >
                                    <template v-slot:append-inner v-if="!creatSecretRequestModel.value">
                                        <v-icon
                                                color="primary"
                                                icon="mdi-attachment"
                                                @click="creatSecretFileInput.click()"
                                        ></v-icon>
                                    </template>
                                </v-textarea>

                                <v-file-input
                                        v-show="creatSecretRequestModel.type === 'file'"
                                        ref="creatSecretFileInput"
                                        label="Secret File"
                                        variant="outlined"
                                        color="primary"
                                        prepend-icon=""
                                        @update:model-value="async (files) => {
                            if(files[0]){
                                creatSecretRequestModel.type = 'file';
                                creatSecretRequestModel.value = await readFileAsValue(files[0]);
                            } else {
                                creatSecretRequestModel.type = 'text';
                                creatSecretRequestModel.value = null;
                            }
                        }"
                                ></v-file-input>

                                <v-select
                                        v-model="creatSecretRequestModel.ttl"
                                        :items="ttlSelectionItems"
                                        label="Expiration"
                                        variant="outlined"
                                        color="primary"
                                        density="comfortable"
                                ></v-select>

                                <v-text-field
                                        v-model="creatSecretRequestModel.passphrase"
                                        type="password"
                                        suggested="new-password"
                                        label="Passphrase (optional)"
                                        variant="underlined"
                                        color="primary"
                                        density="compact"
                                ></v-text-field>

                                <v-btn
                                        type="submit"
                                        color="primary"
                                        variant="elevated"
                                        text="Create Secret"
                                        :disabled="!creatSecretRequestModel.value"
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
                        <template v-if="!getSecretResponseModel.value">
                            <v-form @submit.prevent="getSecret">
                                <v-text-field
                                        v-model="getSecretRequestModel.passphrase"
                                        type="password"
                                        suggested="new-password"
                                        label="Passphrase (optional)"
                                        variant="underlined"
                                        color="primary"
                                        density="compact"
                                        clearable
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
                            <v-textarea
                                    v-if="getSecretResponseModel.type === 'text'"
                                    v-model="getSecretResponseModel.value"
                                    readonly
                                    label="Secret Value"
                                    variant="outlined"
                                    color="primary"
                                    max-rows="16"
                                    rows="1"
                                    auto-grow="auto-grow"
                            >
                                <template v-slot:append-inner>
                                    <v-icon
                                            color="primary"
                                            icon="mdi-clipboard-text"
                                            @click="copyToClipboard('Secret Value', getSecretResponseModel.value);"
                                    ></v-icon>
                                </template>
                            </v-textarea>

                            <v-text-field
                                    v-if="getSecretResponseModel.type === 'file'"
                                    :model-value="getSecretResponseModel.value?.split('|')[0]"
                                    readonly
                                    label="Secret File"
                                    variant="outlined"
                                    color="primary"
                            >
                                <template v-slot:append-inner>
                                    <v-icon
                                            color="primary"
                                            icon="mdi-download"
                                            @click="downloadFileValue(getSecretResponseModel.value)"
                                    ></v-icon>
                                </template>
                            </v-text-field>

                            <v-btn
                                    color="primary"
                                    variant="elevated"
                                    text="Dismiss"
                                    @click="getSecretResponseModel = { value: null, type: 'text' }; token = null;"
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

        <v-snackbar v-model="snackbar.active" variant="elevated" location="">
            <div class="text-center" style="font-weight: bold">{{ snackbar.message }}</div>
        </v-snackbar>
    </v-app>
</template>

<style scoped>

</style>

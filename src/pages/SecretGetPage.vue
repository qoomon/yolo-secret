<script setup lang="ts" xmlns="http://www.w3.org/1999/html">

import {onMounted, ref, watchEffect} from "vue";
import {useRoute} from 'vue-router';
import axios from "axios"
import SecretGetView from "@/components/SecretGetView.vue";
import SecretGetShowView from "@/components/SecretGetShowView.vue";

const route = useRoute()
// ----------------------------------------------------------------------------

const snackbar = ref({
    active: false,
    color: 'success' as 'success' | 'error' | 'info' | 'warning',
    message: null as string | null,
});

const secretToken = route.params.token;
const secretMetaData = ref<{
    status: 'UNREAD' | 'READ' | 'TOO_MANY_PASSPHRASE_ATTEMPTS' | 'DELETED',
    expiresAt: number,
    passphrase?: boolean
} | undefined>();

onMounted(async () => {
    await getSecretMetaData()
});
async function getSecretMetaData() {
    try {
        secretMetaData.value = await axios
            .get(`/api/secrets/${secretToken}/meta`)
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
// --- Get Secret ---
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
            .get(`/api/secrets/${secretToken}`, {
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
    <v-container style="width: 100%; max-width: 440px">
        <v-card class="mx-auto">
            <v-container>
                <secret-get-view
                        v-if="!getSecretResponseModel"
                        v-model="getSecretRequestModel"
                        :meta-data="secretMetaData"
                        @reveal="getSecretData"
                />
                <secret-get-show-view
                        v-else
                        :secret="getSecretResponseModel"
                        @dismiss="getSecretResponseModel = undefined;"
                />
            </v-container>
        </v-card>
    </v-container>

    <v-snackbar v-model="snackbar.active" variant="elevated" :color="snackbar.color">
        <div class="text-center" style="font-weight: bold">{{ snackbar.message }}</div>
    </v-snackbar>
</template>

<style>

</style>

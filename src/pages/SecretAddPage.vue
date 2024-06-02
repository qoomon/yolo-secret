<script setup lang="ts" xmlns="http://www.w3.org/1999/html">

import {ref} from "vue";
import axios from "axios"
import SecretAddView from "@/components/SecretAddView.vue";
import SecretAddUrlView from "@/components/SecretAddUrlView.vue";

// ----------------------------------------------------------------------------

const snackbar = ref({
    active: false,
    color: 'success' as 'success' | 'error' | 'info' | 'warning',
    message: null as string | null,
});

// ----------------------------------------------------------------------------
// --- Create Secret ---
// ----------------------------------------------------------------------------

const addSecretRequestModel = ref<{
    type: 'text' | 'file',
    data?: string,
    name?: string,
    ttl?: number,
    passphrase?: string,
}>({type: 'text'});


const addSecretResponseModel = ref<{
    id: string,
    password: string,
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
    } catch (e: any) {
        console.error(e)
        snackbar.value = {
            active: true,
            color: 'error',
            message: 'Failed to Create Secret' + (e.response?.data?.error ? `: ${e.response.data.error}` : ''),
        };
    }
}

</script>

<template>
    <v-container style="width: 100%; max-width: 440px">
        <v-card class="mx-auto">
            <v-container>
                <secret-add-view
                        v-if="!addSecretResponseModel"
                        v-model="addSecretRequestModel"
                        @submit="addSecret"/>

                <secret-add-url-view
                        v-else
                        :url="addSecretResponseModel.htmlUrl"
                        @dismiss="addSecretResponseModel = undefined;"/>
            </v-container>
        </v-card>
    </v-container>

    <v-snackbar v-model="snackbar.active" variant="elevated" :color="snackbar.color">
        <div class="text-center" style="font-weight: bold">{{ snackbar.message }}</div>
    </v-snackbar>
</template>

<style>

</style>

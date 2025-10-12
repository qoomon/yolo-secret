<script setup lang="ts" xmlns="http://www.w3.org/1999/html">

import {ref} from "vue";
import axios from "axios"
import SecretAddView from "@/components/SecretAddView.vue";
import SecretAddUrlView from "@/components/SecretAddUrlView.vue";
import {encrypt, generatePassword, createHash} from "@/lib/crypto.ts";
import {createId} from '@paralleldrive/cuid2';

// ----------------------------------------------------------------------------

const snackbar = ref({
  active: false,
  color: 'success' as 'success' | 'error' | 'info' | 'warning',
  message: null as string | null,
});

// ----------------------------------------------------------------------------
// --- Create Secret ---
// ----------------------------------------------------------------------------

const addSecretModel = ref<{
  data: { text: string, filename?: string, date?: Date },
  ttl?: number,
  password?: string,
}>({data: {text: ''}});

const addSecretResponseModel = ref<{
  id: string,
  htmlUrl: string,
} | undefined>();


async function addSecret() {
  try {
    const id = createId();
    const data = addSecretModel.value.data;
    const ttl = addSecretModel.value.ttl;

    const userPassword = addSecretModel.value.password || '';
    const generatedPassword = generatePassword(32) + (userPassword ? `+` : '');
    const password = generatedPassword + userPassword;

    const encryptedData = await encrypt(data, password);

    const prove = await createHash(password, id);

    addSecretResponseModel.value = await axios
        .post('/api/secrets', {id, encryptedData, prove, ttl})
        .then((response) => ({
          ...response.data,
          htmlUrl: location.origin
              + `/${id}#${generatedPassword}`,
        }));

    // clear secret model
    addSecretModel.value = {data: {text: ''}};
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
            v-model="addSecretModel"
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

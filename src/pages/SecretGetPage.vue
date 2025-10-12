<script setup lang="ts" xmlns="http://www.w3.org/1999/html">

import {onMounted, ref, watch} from "vue";
import {useRoute} from 'vue-router';
import axios from "axios"
import SecretGetView from "@/components/SecretGetView.vue";
import SecretGetShowView from "@/components/SecretGetShowView.vue";
import {createHash, decrypt} from "@/lib/crypto.ts";

const route = useRoute()
// ----------------------------------------------------------------------------

const snackbar = ref({
  active: false,
  color: 'success' as 'success' | 'error' | 'info' | 'warning',
  message: null as string | null,
});

const secretId = route.params.id as string;
const secretMetaData = ref<{
  status: 'UNREAD' | 'READ' | 'TOO_MANY_ATTEMPTS' | 'DELETED',
  expiresAt: number,
  attemptsRemaining: number,
} | undefined | null>();

onMounted(async () => {
  await getSecretMetaData();
  onRouteChange();
});

watch(route, async () => {
  onRouteChange();
});

function onRouteChange() {
  getSecretRequestModel.value.encryptionPassword = location.hash.substring(1) || undefined;
  getSecretRequestModel.value.userPasswordRequired = getSecretRequestModel.value.encryptionPassword?.endsWith('+') ?? false;
}

async function getSecretMetaData() {
  try {
    secretMetaData.value = await axios
        .get(`/api/secrets/${secretId}/meta`)
        .then((response) => response.data);
  } catch (e: any) {
    if (e.response.status === 404) {
      secretMetaData.value = null;
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
const secretDataLoading = ref(false);
const getSecretRequestModel = ref<{
  encryptionPassword?: string,
  userPasswordRequired: boolean,
  userPassword?: string,
}>({userPasswordRequired: false});

const getSecretResponseModel = ref<{
  data: string
  filename?: string,
  date?: Date
} | undefined>();

async function getSecretData() {
  const password = (getSecretRequestModel.value?.encryptionPassword ?? '')
      + (getSecretRequestModel.value?.userPassword ?? '');

  const secretProve = await createHash(password, secretId);

  try {
    secretDataLoading.value = true;

    getSecretResponseModel.value = await axios
        .get(`/api/secrets/${secretId}`, {params: {prove: secretProve}})
        .then(async (response) => ({
          ...response.data,
          ...await decrypt(response.data.encryptedData, password),
        }));

    // clear secret data
    getSecretRequestModel.value = {userPasswordRequired: false};
  } catch (e: any) {
    if (e.response?.status === 404) {
      snackbar.value = {
        active: true,
        color: 'warning',
        message: 'Unknown Secret',
      };
      return;
    } else if (e.response?.status === 410) {
      snackbar.value = {
        active: true,
        color: 'error',
        message: 'Secret has been read already!',
      };
      return;
    } else if (e.response?.status === 400) {
      if (e.response.data.error === 'Invalid prove') {
        snackbar.value = {
          active: true,
          color: 'error',
          message: `Invalid${getSecretRequestModel.value.userPasswordRequired ? ' passphrase or' : ''} decryption key!`,
        };
        return;
      }
    }

    console.error(e)
    snackbar.value = {
      active: true,
      color: 'error',
      message: 'Failed to Get Secret' + (e.response?.data?.error ? `: ${e.response.data.message}` : ''),
    };


  } finally {
    secretDataLoading.value = false;
  }
}

function leaveGetPage() {
  getSecretResponseModel.value = undefined;
  location.href = '/';
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
            :loading="secretDataLoading"
            :meta-data="secretMetaData"
            @reveal="getSecretData"
        />
        <secret-get-show-view
            v-else
            :secret="getSecretResponseModel"
            @dismiss="leaveGetPage()"
        />
      </v-container>
    </v-card>
  </v-container>

  <v-snackbar v-model="snackbar.active" variant="elevated" :color="snackbar.color" location="center">
    <div class="text-center" style="font-weight: bold">{{ snackbar.message }}</div>
  </v-snackbar>
</template>

<style>

</style>

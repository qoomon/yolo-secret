<script setup lang="ts">
import {ref} from "vue";
import {copyToClipboard, downloadBase64File} from "@/lib/utils";

defineProps<{
    secret: {
        type: 'text' | 'file',
        data: string,
        name?: string,
    },
}>();

const emit = defineEmits(['dismiss']);

function onDismiss() {
    emit('dismiss')
}

const secretDataVisibility = ref(false)

function toggleSecretDataVisibility() {
    secretDataVisibility.value = !secretDataVisibility.value
}

const snackbar = ref({
    active: false,
    color: 'success' as 'success' | 'error' | 'info' | 'warning',
    message: null as string | null,
});
</script>

<template>
  <!-- Secret File Download -->
    <v-text-field
            v-if="secret.type === 'file'"
            :model-value="secret.name"
            :readonly="true"
            label="Secret File"
            variant="outlined"
            color="primary"
            prepend-inner-icon="mdi-file"
    >
        <template v-slot:append-inner>
            <v-icon
                    color="primary"
                    icon="mdi-download"
                    @click="downloadBase64File(secret.data!, secret.name!)"
            ></v-icon>
        </template>
    </v-text-field>

  <!-- Secret Text Display -->
    <v-textarea
            v-else
            v-model="secret.data"
            :readonly="true"
            label="Secret Value"
            variant="outlined"
            color="primary"
            max-rows="16"
            rows="4"
            :auto-grow="true"
            :class="{'textarea-masking': !secretDataVisibility}"
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
                        @click="copyToClipboard(secret.data).then(() => {
                            snackbar = { active: true, color: 'info', message: `Copied Value to Clipboard`}
                        });"
                ></v-icon>
            </div>
        </template>
    </v-textarea>

    <v-btn
            text="Dismiss"
            color="primary"
            variant="elevated"
            @click="onDismiss()"
    ></v-btn>

    <v-snackbar v-model="snackbar.active" variant="elevated" :color="snackbar.color">
        <div class="text-center" style="font-weight: bold">{{ snackbar.message }}</div>
    </v-snackbar>
</template>

<style scoped>

</style>

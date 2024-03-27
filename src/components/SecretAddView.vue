<script setup lang="ts">

import {ref, onMounted} from 'vue'
import {readFileAsBase64String} from "@/lib/utils.js";

const ttlSelectionItems: { title: string, value: number, default?: boolean }[] = [
    {title: '5 Minutes', value: 60 * 5},
    {title: '30 Minutes', value: 60 * 30},
    {title: '1 Hour', value: 60 * 60, default: true},
    {title: '4 Hours', value: 60 * 60 * 4},
    {title: '12 Hours', value: 60 * 60 * 12},
    {title: '1 Day', value: 60 * 60 * 24},
    {title: '3 Days', value: 60 * 60 * 24 * 3},
    {title: '7 Days', value: 60 * 60 * 24 * 7},
];

const emit = defineEmits(['submit'])
const props = defineProps<{
    modelValue: {
        type: 'text' | 'file',
        data?: string,
        name?: string,
        ttl?: number,
        passphrase?: string,
    },
}>()
onMounted(() => {
    props.modelValue.ttl = ttlSelectionItems.find((item) => item.default)?.value
})

const state = ref<'prepare'|'submitted'>('prepare')
const fileInput = ref()

async function modelValue_setFile(file: File) {
    if (file) {
        props.modelValue.type = 'file';
        props.modelValue.data = await readFileAsBase64String(file);
        props.modelValue.name = file.name;
    } else {
        props.modelValue.type = 'text';
        props.modelValue.data = undefined;
    }
}

function onsubmit() {
    state.value = 'submitted'
    emit('submit', props.modelValue)
}

</script>

<template>
    <v-form @submit.prevent="onsubmit">
        <!-- Secret Text -->
        <v-textarea
                name="data"
                v-if="props.modelValue.type === 'text'"
                v-model="props.modelValue.data"
                label="Secret Value"
                variant="outlined"
                color="primary"
                :auto-grow="true"
                max-rows="16"
                rows="4"
                :autofocus="true"
                :spellcheck="false"
        >
            <template v-slot:append-inner>
                <v-icon
                        v-if="!props.modelValue.data"
                        color="primary"
                        icon="mdi-attachment"
                        @click="fileInput.click()"
                ></v-icon>
            </template>
        </v-textarea>

        <!-- Secret File -->
        <v-file-input
                name="data:file"
                v-show="props.modelValue.type === 'file'"
                ref="fileInput"
                label="Secret File"
                variant="outlined"
                color="primary"
                prepend-icon=""
                prepend-inner-icon="mdi-file"
                @update:model-value="async (files) => modelValue_setFile(files[0])"
        ></v-file-input>

        <v-select
                name="ttl"
                v-model="props.modelValue.ttl"
                :items="ttlSelectionItems"
                label="Expiration"
                variant="outlined"
                color="primary"
                density="comfortable"
        ></v-select>

        <v-text-field
                name="passphrase"
                v-model="props.modelValue.passphrase"
                type="password"
                autocomplete="off"
                label="Passphrase (optional)"
                variant="underlined"
                color="primary"
                density="compact"
                :spellcheck="false"
        ></v-text-field>

        <v-btn
                type="submit"
                color="primary"
                :variant="state === 'submitted' ? 'outlined' : 'elevated'"
                text="Create Secret"
                :disabled="!props.modelValue.data || state === 'submitted'"
                :loading="state === 'submitted'"
        ></v-btn>
    </v-form>
</template>

<style scoped>

</style>

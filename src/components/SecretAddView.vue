<script setup lang="ts">

import {onMounted, ref} from 'vue'
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
    data: { text: string, filename?: string, date?: Date },
    ttl?: number,
    password?: string,
  },
}>();

onMounted(() => {
  props.modelValue.ttl = ttlSelectionItems.find((item) => item.default)?.value
});

const state = ref<'prepare' | 'submitted'>('prepare')
const fileInput = ref()

async function modelValue_setFile(file?: File) {
  if (file) {
    props.modelValue.data = {
      filename: file.name,
      text: await readFileAsBase64String(file),
    };
  } else {
    props.modelValue.data = { text: ''};
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
        v-if="!props.modelValue.data.filename"
        v-model="props.modelValue.data.text"
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
            v-if="!props.modelValue.data.text"
            color="primary"
            icon="mdi-attachment"
            @click="fileInput.click()"
        ></v-icon>
      </template>
    </v-textarea>

    <!-- Secret File -->
    <v-file-input
        name="data:file"
        v-show="props.modelValue.data.filename"
        ref="fileInput"
        label="Secret File"
        variant="outlined"
        color="primary"
        prepend-icon=""
        prepend-inner-icon="mdi-file"
        @update:model-value="async (files) => modelValue_setFile(Array.isArray(files) ? files[0] : files)"
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
        name="password"
        v-model="props.modelValue.password"
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
        :disabled="!props.modelValue.data.text || state === 'submitted'"
        :loading="state === 'submitted'"
    ></v-btn>
  </v-form>
</template>

<style scoped>

</style>

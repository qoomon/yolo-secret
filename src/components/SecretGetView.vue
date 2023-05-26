<script setup lang="ts">
import {computed, ref} from "vue";
import formatDuration from "humanize-duration"

const emit = defineEmits(['reveal'])
const props = defineProps<{
    metaData?: {
        status: 'UNREAD' | 'READ' | 'TOO_MANY_PASSPHRASE_ATTEMPTS' | 'DELETED',
        expiresAt: number,
        passphrase?: boolean,
    },
    modelValue: {
        passphrase?: string,
    },
}>()

function onReveal() {
    emit('reveal')
}

const snackbar = ref({
    active: false,
    color: 'success' as 'success' | 'error' | 'info' | 'warning',
    message: null as string | null,
});

const metaDataStatusText = computed(() => {
    if (!props.metaData) return '...';
    if (props.metaData.status === 'UNREAD') return 'Not Yet Revealed';
    if (props.metaData.status === 'READ') return 'Has Been Revealed Already';
    if (props.metaData.status === 'TOO_MANY_PASSPHRASE_ATTEMPTS') return 'Too Many Passphrase Attempts';
    return '...';
});
</script>

<template>
    <v-form @submit.prevent="onReveal">
        <v-text-field
                v-if="props.metaData?.passphrase"
                name="passphrase"
                v-model="props.modelValue.passphrase"
                type="password"
                autocomplete="off"
                label="Passphrase"
                variant="underlined"
                color="primary"
                density="compact"
                :spellcheck="false"
                :autofocus="true"
        ></v-text-field>
        <div
                v-if="!props.metaData?.status"
                class="text-body-1 text-center text-disabled"
        >
            Loading...
        </div>
        <v-btn
                v-else-if="props.metaData?.status === 'UNREAD'"
                type="submit"
                color="primary"
                variant="elevated"
                text="Reveal Secret"
                :block="true"
                :disabled="props.metaData?.passphrase === true && !props.modelValue.passphrase"
        ></v-btn>
        <div v-else class="text-body-1 text-center text-error">
            {{ metaDataStatusText }}
        </div>
    </v-form>
    <div
            v-if="props.metaData?.status === 'UNREAD' && props.metaData?.expiresAt"
            class="text-center text-caption text-disabled" style="margin-top:8px;"
    >
        Expires in {{
        formatDuration(Math.floor(props.metaData?.expiresAt - (Date.now() / 1000)) * 1000)
        }}
    </div>
</template>

<style scoped>

</style>
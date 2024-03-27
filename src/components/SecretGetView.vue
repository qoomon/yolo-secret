<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
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

const state = ref<'pending'|'revealed'>('pending')
const now = ref(new Date());
let nowInterval = 0;
onMounted(() => {
    nowInterval = setInterval(() => {
        now.value = new Date();
    }, 1000);
});
onBeforeUnmount(() => {
    if (nowInterval) clearInterval(nowInterval);
})

const expiresAtDisplayText = computed(() => {
    const duration = (props.metaData?.expiresAt ?? 0) * 1000 - now.value.getTime();
    if (duration > 0) return "Expires in " + formatDuration(duration, {round: true});
    return "Expired";
});

function onReveal() {
    state.value = 'revealed'
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
                v-if="metaData?.passphrase"
                name="passphrase"
                v-model="modelValue.passphrase"
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
                v-if="!metaData?.status"
                class="text-body-1 text-center text-disabled"
        >
            Loading...
        </div>
        <v-btn
                v-else-if="metaData?.status === 'UNREAD'"
                type="submit"
                color="primary"
                :variant="state === 'revealed' ? 'outlined' : 'elevated'"
                text="Reveal Secret"
                :block="true"
                :disabled="(metaData?.passphrase === true && !modelValue.passphrase) || state === 'revealed'"
                :loading="state === 'revealed'"
        ></v-btn>
        <div v-else class="text-body-1 text-center text-error">
            {{ metaDataStatusText }}
        </div>
    </v-form>
    <div
            v-if="metaData?.status === 'UNREAD' && metaData?.expiresAt"
            class="text-center text-caption text-disabled" style="margin-top:8px;"
    >
        {{ expiresAtDisplayText }}
    </div>
</template>

<style scoped>

</style>

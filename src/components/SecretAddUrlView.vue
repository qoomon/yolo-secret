<script setup lang="ts">
import {ref} from "vue";
import {copyToClipboard} from "@/lib/utils";

const emit = defineEmits(['dismiss']);
const props = defineProps<{
    url: string,
}>();

function onDismiss() {
    emit('dismiss');
}

const snackbar = ref({
    active: false,
    color: 'success' as 'success' | 'error' | 'info' | 'warning',
    message: null as string | null,
});
</script>

<template>
    <v-text-field
            :model-value="props.url"
            :readonly="true"
            label="Secret URL"
            variant="outlined"
            color="primary"
    >
        <template v-slot:append-inner>
            <v-icon
                    color="primary"
                    icon="mdi-clipboard-text"
                    @click="copyToClipboard(props.url).then(() => {
                        snackbar = { active: true,color: 'info', message: `Copied URL to Clipboard`}
                    })"
            ></v-icon>
        </template>
    </v-text-field>
    <v-btn
            color="primary"
            variant="elevated"
            text="Dismiss"
            @click="onDismiss()"
    ></v-btn>

    <v-snackbar v-model="snackbar.active" variant="elevated" :color="snackbar.color">
        <div class="text-center" style="font-weight: bold">{{ snackbar.message }}</div>
    </v-snackbar>
</template>

<style scoped>

</style>
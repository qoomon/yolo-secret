<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import formatDuration from "humanize-duration"

const emit = defineEmits(['reveal'])
const props = defineProps<{
  loading?: boolean,
  metaData?: {
    status: 'UNREAD' | 'READ' | 'TOO_MANY_ATTEMPTS' | 'DELETED',
    expiresAt: number,
    attemptsRemaining: number, // TODO display remaining attempts
  } | null,
  modelValue: {
    userPasswordRequired: boolean,
    userPassword?: string,
  },
}>()

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
  emit('reveal');
}

const statusText = computed(() => {
  if (props.metaData) {
    if (props.metaData.status === 'UNREAD') {
      return 'The secret has not been revealed yet.';
    }
    if (props.metaData.status === 'READ') {
      return 'The secret has been deleted.'
          + '\n\nHas been revealed!';
    }
    if (props.metaData.status === 'TOO_MANY_ATTEMPTS') {
      return 'The secret has been deleted.'
          + '\n\nToo many attempts!';
    }
  }
  if (props.metaData === null) {
    return 'Unknown secret.';
  }
});
</script>

<template>
  <v-form @submit.prevent="onReveal">
    <v-text-field
        v-if="modelValue.userPasswordRequired && metaData?.status === 'UNREAD' "
        name="passphrase"
        v-model="modelValue.userPassword"
        type="password"
        autocomplete="off"
        label="Passphrase"
        variant="underlined"
        color="primary"
        density="compact"
        :spellcheck="false"
    ></v-text-field>
    <div
        v-if="!statusText"
        class="text-body-1 text-center text-disabled"
    >
      Loading...
    </div>
    <v-btn
        v-else-if="metaData?.status === 'UNREAD'"
        type="submit"
        color="primary"
        :variant="loading ? 'outlined' : 'elevated'"
        text="Reveal Secret"
        :block="true"
        :disabled="loading"
        :loading="loading"
    ></v-btn>
    <div v-else class="font-weight-bold text-body-1 text-center text-error">
      <span style="white-space: pre-line;">{{ statusText }}</span>
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

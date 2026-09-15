<template>
  <div class="file-upload">
    <input ref="inputRef" type="file" hidden :accept="acceptedExtensions" :disabled="busy || cancelling || loadingOptions"
           @change="inputChanged"/>
    <slot v-bind="slotProps">
      <div v-if="loadingOptions" class="mb-[12px]"><el-text type="info">正在加载上传配置…</el-text></div>
      <div v-else-if="optionsError" class="mb-[12px]">
        <el-alert :title="optionsError" type="error" :closable="false" show-icon/>
        <el-button class="mt-[12px]" @click="loadOptions">重新加载</el-button>
      </div>
      <template v-if="policy && !loadingOptions && !optionsError">
        <FormNote title="自动选择上传方式" icon="UploadFilled"
                  description="小文件直接上传，大文件自动分片。关闭窗口可暂停分片上传，之后可继续未完成的会话。"/>
        <div v-if="target && sessionId && !completed" class="mb-[12px]">
          <el-alert :closable="false" :title="'继续上传：' + target.name" type="info" show-icon/>
        </div>
        <el-form label-position="top" @submit.prevent>
          <el-form-item label="存储账号">
            <el-select v-model="storageId" size="large" :disabled="disabled || busy || cancelling || !!sessionId" placeholder="请选择存储账号">
              <el-option v-for="account in storages" :key="account.id" :value="account.id"
                         :label="account.name + (account.is_default ? '（默认）' : '')"/>
              <el-option v-if="target && sessionId && !storages.some((item: StorageOption) => item.id === target?.storage_id)"
                         :value="target.storage_id" :label="target.storage_name || '原存储账号'"/>
            </el-select>
          </el-form-item>
        </el-form>
        <div v-if="!storages.length && !sessionId" class="mb-[12px]">
          <el-alert :closable="false" title="暂无可用存储，请先在存储管理中添加并启用账号。" type="warning" show-icon/>
        </div>
        <el-upload v-if="!busy" ref="uploadRef" drag :auto-upload="false" :show-file-list="false"
                   :disabled="!canSelect" :accept="acceptedExtensions" :on-change="selectFile">
          <el-icon class="el-icon--upload"><UploadFilled/></el-icon>
          <div class="el-upload__text">{{ completed ? '上传成功，可继续拖入文件，或' : '将文件拖到这里，或' }} <em>点击选择</em></div>
          <template #tip>
            <div class="el-upload__tip">超过 {{ formatFileSize(policy.ordinary_limit) }} 自动分片，每片 {{ formatFileSize(policy.part_size) }}；新会话有效期 {{ policy.session_days }} 天。</div>
            <div class="el-upload__tip">{{ extensionHint }}</div>
            <div v-if="maxSize" class="el-upload__tip">业务文件大小上限：{{ formatFileSize(maxSize) }}</div>
          </template>
        </el-upload>
        <div v-else class="mb-[12px]">
          <el-alert :closable="false" title="正在上传，请等待完成或先暂停，上传期间不能更换文件。" type="info" show-icon/>
        </div>
        <div v-if="file" class="upload-file-summary">
          <el-icon><Document/></el-icon>
          <div><strong>{{ file.name }}</strong><span>{{ formatFileSize(file.size) }}</span></div>
          <el-tag :type="file.size > policy.ordinary_limit ? 'warning' : 'info'">{{ file.size > policy.ordinary_limit ? '分片上传' : '普通上传' }}</el-tag>
        </div>
        <div v-if="file" class="upload-progress">
          <p class="upload-progress-label">{{ completed ? '上传完成' : processing && busy ? '正在处理' : sessionId ? '已保存分片进度' : '文件发送进度' }}</p>
          <el-progress v-if="processing && busy" :percentage="100" indeterminate :show-text="false"/>
          <el-progress v-else :percentage="progress" :status="completed ? 'success' : error ? 'exception' : undefined"/>
          <p>{{ message || '选择完成，点击开始上传' }}</p>
        </div>
        <div v-if="error" class="mb-[12px]">
          <el-alert :closable="false" :title="error" type="error" show-icon/>
        </div>
      </template>
      <div class="file-upload-actions">
        <el-button v-if="sessionId && !busy && !completed" type="danger" plain icon="Delete" :loading="cancelling" :disabled="disabled" @click="cancelSession">取消上传</el-button>
        <el-button v-if="busy" icon="VideoPause" @click="pause">暂停</el-button>
        <el-button v-else type="primary" icon="Upload" :disabled="!canStart" @click="start">
          {{ sessionId ? '继续上传' : '开始上传' }}
        </el-button>
      </div>
    </slot>
  </div>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, ref, watch} from "vue";
import {type UploadFile, type UploadInstance} from "element-plus";
import {Document, UploadFilled} from "@element-plus/icons-vue";
import FormNote from "./FormNote.vue";
import {confirmDelete} from "../utils/confirmDelete";
import type {StorageOption} from "../apis/sys_storage";
import {formatFileSize, SysFileApi, type ManagedFile, type UploadPolicy} from "../apis/sys_file";

const props = withDefaults(defineProps<{
  target?: ManagedFile
  policy?: UploadPolicy
  storages?: StorageOption[]
  autoUpload?: boolean
  disabled?: boolean
  allowedExtensions?: string[]
  maxSize?: number
}>(), {autoUpload: true, disabled: false})
const loadedOptions = ref<{policy: UploadPolicy; storages: StorageOption[]}>()
const loadingOptions = ref(false)
const optionsError = ref('')
const policy = computed(() => props.policy ?? loadedOptions.value?.policy)
const storages = computed(() => (props.storages ?? loadedOptions.value?.storages ?? []).filter(item => item.enabled))
const businessExtensions = computed(() => (props.allowedExtensions ?? []).map(item => item.trim().toLowerCase().replace(/^\./, '')))
const allowedExtensions = computed(() => {
  const global = policy.value?.allowed_extensions ?? []
  if (!businessExtensions.value.length) return global
  return global.length ? businessExtensions.value.filter(item => global.includes(item)) : businessExtensions.value
})
const extensionHint = computed(() => {
  if (allowedExtensions.value.length) return '允许上传：' + allowedExtensions.value.join('、')
  return businessExtensions.value.length ? '业务类型与全局允许类型不匹配，当前无法上传' : '文件类型不限'
})
const acceptedExtensions = computed(() => allowedExtensions.value.map(extension => "." + extension).join(","))
const emit = defineEmits<{changed: []; success: [file: ManagedFile]; session: [file: ManagedFile]; cancelled: []; error: [message: string]}>()
const uploadRef = ref<UploadInstance>()
const inputRef = ref<HTMLInputElement>()
const result = ref<ManagedFile>()
const cancelling = ref(false)
const file = ref<File>()
const busy = ref(false)
const completed = ref(false)
const sessionId = ref(0)
const storageId = ref<number>()
const progress = ref(0)
const processing = ref(false)
const error = ref('')
const message = ref('')
let controller: AbortController | undefined
let disposed = false

let optionsController: AbortController | undefined
let runId = 0

async function loadOptions() {
  optionsController?.abort()
  const request = new AbortController()
  optionsController = request
  loadingOptions.value = true
  optionsError.value = ''
  try {
    if (!props.policy || !props.storages) {
      const response = await SysFileApi.Options(request.signal)
      if (request.signal.aborted || disposed) return
      loadedOptions.value = response.data
    }
    storageId.value = sessionId.value
        ? storageId.value
        : storages.value.find(item => item.is_default)?.id
  } catch (reason) {
    if (!request.signal.aborted && !disposed) {
      optionsError.value = reason instanceof Error ? reason.message : '上传配置加载失败，请重试'
    }
  } finally {
    if (optionsController === request) loadingOptions.value = false
  }
}

function reset() {
  if (cancelling.value) return
  runId++
  pause()
  busy.value = false
  file.value = undefined
  result.value = undefined
  sessionId.value = props.target?.id || 0
  storageId.value = props.target?.storage_id
  progress.value = 0
  processing.value = false
  completed.value = false
  error.value = ''
  message.value = ''
  uploadRef.value?.clearFiles()
  if (inputRef.value) inputRef.value.value = ''
  void loadOptions()
}

watch(() => props.target?.id, id => {
  if (id && id === sessionId.value) return
  reset()
}, {immediate: true})

function reportError(value: string) {
  error.value = value
  emit('error', value)
}

function select() {
  if (props.disabled || busy.value || cancelling.value || loadingOptions.value || optionsError.value) return
  inputRef.value?.click()
}

function inputChanged(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  input.value = ''
  if (selected) chooseFile(selected)
}

function setStorage(id: number) {
  if (props.disabled || busy.value || cancelling.value || sessionId.value) return
  if (storages.value.some(item => item.id === id)) storageId.value = id
}

function isAllowedFile(selected: File) {
  const index = selected.name.lastIndexOf(".")
  const extension = index < 0 ? "" : selected.name.slice(index + 1).toLowerCase()
  const global = policy.value?.allowed_extensions ?? []
  return (!global.length || global.includes(extension)) &&
      (!businessExtensions.value.length || businessExtensions.value.includes(extension))
}
function selectFile(selected: UploadFile) {
  uploadRef.value?.clearFiles()
  if (selected.raw) chooseFile(selected.raw)
}

function chooseFile(selected: File) {
  if (props.disabled || busy.value || cancelling.value || loadingOptions.value || optionsError.value || !policy.value) return
  if (!isAllowedFile(selected)) {
    reportError('不允许上传此文件类型。' + extensionHint.value)
    return
  }
  if (props.maxSize && selected.size > props.maxSize) {
    reportError('文件过大，业务最大支持 ' + formatFileSize(props.maxSize))
    return
  }
  if (sessionId.value && props.target && (selected.name !== props.target.name ||
      selected.size !== props.target.size || selected.lastModified !== props.target.last_modified)) {
    reportError('请选择原来的文件，文件名、大小和修改时间必须一致')
    return
  }
  file.value = selected
  result.value = undefined
  progress.value = 0
  processing.value = false
  completed.value = false
  error.value = ''
  message.value = ''
  if (props.autoUpload) void start()
}
function pause() {
  controller?.abort()
}
async function start() {
  const selected = file.value
  const currentPolicy = policy.value
  if (props.disabled || cancelling.value || completed.value || !selected || !currentPolicy || busy.value || !storageId.value || loadingOptions.value || optionsError.value) return
  const current = runId
  let uploaded: ManagedFile
  error.value = ''
  if (!isAllowedFile(selected)) {
    reportError('不允许上传此文件类型。' + extensionHint.value)
    return
  }
  if (props.maxSize && selected.size > props.maxSize) {
    reportError('文件过大，业务最大支持 ' + formatFileSize(props.maxSize))
    return
  }
  if (!sessionId.value && selected.size > currentPolicy.max_size) {
    reportError('文件过大，最大支持 ' + formatFileSize(currentPolicy.max_size))
    return
  }
  busy.value = true
  processing.value = false
  progress.value = 0
  controller = new AbortController()
  const signal = controller.signal
  try {
    if (!sessionId.value && selected.size <= currentPolicy.ordinary_limit) {
      message.value = '正在发送文件到服务器…'
      const response = await SysFileApi.Upload(selected, storageId.value, signal, event => {
        if (current !== runId || signal.aborted || disposed) return
        const ratio = event.total ? event.loaded / event.total : event.progress || 0
        progress.value = Math.min(100, Math.floor(ratio * 100))
        if (ratio >= 1) {
          processing.value = true
          message.value = '文件已发送，服务器正在写入存储，请等待完成…'
        }
      })
      uploaded = response.data
    } else {
      processing.value = true
      message.value = sessionId.value ? '正在读取上传会话…' : '正在创建上传会话…'
      const response = sessionId.value
          ? await SysFileApi.Session(sessionId.value, signal)
          : await SysFileApi.Begin(selected, storageId.value, signal)
      if (current !== runId || signal.aborted || disposed) return
      const session = response.data
      uploaded = session.file
      sessionId.value = session.file.id
      emit("session", session.file)
      processing.value = false
      if (session.file.name !== selected.name || session.file.size !== selected.size ||
          session.file.last_modified !== selected.lastModified) {
        throw new Error('请选择原来的文件，文件名、大小和修改时间必须一致')
      }
      if (session.file.status !== 'ready') {
        const received = new Set(session.parts.map(part => part.number))
        let loaded = session.parts.reduce((sum, part) => sum + part.size, 0)
        progress.value = Math.min(100, Math.floor(loaded / selected.size * 100))
        const total = Math.ceil(selected.size / session.part_size)
        for (let number = 1; number <= total; number++) {
          if (current !== runId || signal.aborted || disposed) return
          if (received.has(number)) continue
          const blob = selected.slice((number - 1) * session.part_size, number * session.part_size)
          message.value = '正在发送第 ' + number + ' / ' + total + ' 片…'
          await SysFileApi.Part(sessionId.value, number, blob, signal, event => {
            if (current !== runId || signal.aborted || disposed) return
            const sent = Math.min(event.loaded, blob.size)
            message.value = sent >= blob.size
                ? '第 ' + number + ' / ' + total + ' 片已发送，正在等待存储确认…'
                : '正在发送第 ' + number + ' / ' + total + ' 片：' + formatFileSize(sent) + ' / ' + formatFileSize(blob.size)
          })
          if (current !== runId || signal.aborted || disposed) return
          // 只有后端确认分片已保存，才计入进度；发送字节不等于存储完成。
          loaded += blob.size
          progress.value = Math.min(100, Math.floor(loaded / selected.size * 100))
        }
        processing.value = true
        message.value = '全部分片已保存，正在合并文件…'
        const response = await SysFileApi.Complete(sessionId.value, signal)
        uploaded = response.data
      }
    }
    if (current !== runId || signal.aborted || disposed) return
    processing.value = false
    sessionId.value = 0
    completed.value = true
    progress.value = 100
    message.value = '上传完成'
    result.value = uploaded
    emit('success', uploaded)
  } catch (reason) {
    if (current !== runId || disposed) return
    if (signal.aborted) message.value = sessionId.value ? '上传已暂停，可继续上传' : '上传已取消'
    else reportError(reason instanceof Error ? reason.message : '上传失败，请重试')
  } finally {
    if (current === runId) {
      busy.value = false
      processing.value = false
      controller = undefined
    }
    if (!disposed) emit('changed')
  }
}
async function cancel() {
  if (cancelling.value || busy.value || props.disabled || !sessionId.value) return
  const id = sessionId.value
  const current = runId
  cancelling.value = true
  try {
    await SysFileApi.Abort(id)
    if (disposed || current !== runId) return
    sessionId.value = 0
    file.value = undefined
    result.value = undefined
    progress.value = 0
    processing.value = false
    completed.value = false
    error.value = ''
    message.value = '上传已取消'
    emit('cancelled')
    emit('changed')
  } catch (reason) {
    if (!disposed && current === runId) reportError(reason instanceof Error ? reason.message : '取消上传失败，请重试')
  } finally {
    cancelling.value = false
  }
}

async function cancelSession() {
  await confirmDelete({
    subject: '上传会话', count: 1,
    description: '删除本次上传记录及已上传的分片，之后需要重新上传。',
    onConfirm: cancel,
  })
}

const canSelect = computed(() => !props.disabled && !busy.value && !cancelling.value &&
    !loadingOptions.value && !optionsError.value && !!policy.value)
const canStart = computed(() => canSelect.value && !!file.value && !!storageId.value && !completed.value)
const slotProps = computed(() => ({
  file: file.value,
  result: result.value,
  uploading: busy.value,
  processing: processing.value,
  cancelling: cancelling.value,
  completed: completed.value,
  progress: progress.value,
  error: error.value || optionsError.value,
  message: message.value,
  loading: loadingOptions.value,
  policy: policy.value,
  storages: storages.value,
  storageId: storageId.value,
  sessionId: sessionId.value,
  allowedExtensions: allowedExtensions.value,
  accept: acceptedExtensions.value,
  canSelect: canSelect.value,
  canStart: canStart.value,
  select, chooseFile, setStorage, start, pause, resume: start, cancel, reset, reload: loadOptions,
}))
defineSlots<{default(props: typeof slotProps.value): unknown}>()
defineExpose({select, chooseFile, start, pause, resume: start, cancel, reset, reload: loadOptions})

onBeforeUnmount(() => { disposed = true; runId++; pause(); optionsController?.abort() })
</script>

<style scoped>
.file-upload-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
.file-upload-actions :deep(.el-button + .el-button) { margin-left: 0; }
.upload-file-summary {
  display: flex; align-items: center; gap: 12px; margin: 20px 0;
  padding: 14px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px;
}
.upload-file-summary > .el-icon { font-size: 24px; color: var(--el-color-primary); }
.upload-file-summary > div { flex: 1; min-width: 0; }
.upload-file-summary strong { display: block; overflow-wrap: anywhere; font-size: 14px; }
.upload-file-summary span, .upload-progress p { font-size: 12px; color: var(--el-text-color-secondary); }
.upload-progress { margin: 20px 0; }
</style>

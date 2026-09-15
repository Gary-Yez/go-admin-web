<template>
  <button ref="element" type="button" class="file-preview" :class="kind.name"
          :disabled="row.status !== 'ready'" :title="title" :aria-label="title" @click="open">
    <img v-if="url && !failed" :src="url" :alt="row.name" loading="lazy" referrerpolicy="no-referrer"
         @error="failed = true"/>
    <template v-else>
      <el-icon :size="24"><component :is="kind.icon"/></el-icon>
      <span>{{ row.status !== 'ready' ? '未完成' : loading ? '加载中' : failed ? '重试预览' : kind.label }}</span>
    </template>
  </button>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {Picture, VideoCamera, Headset, Document, Files, Folder, Tickets} from '@element-plus/icons-vue'
import {SysFileApi, type ManagedFile} from '../../apis/sys_file'

import {filePreviewKind} from './fileTypes'

const props = defineProps<{row: ManagedFile}>()
const emit = defineEmits<{preview: [row: ManagedFile]; download: [row: ManagedFile]}>()
const element = ref<HTMLElement>()
const url = ref('')
const failed = ref(false)
const loading = ref(false)
let visible = false
let observer: IntersectionObserver | undefined
let controller: AbortController | undefined

const isImage = computed(() => filePreviewKind(props.row) === 'image')
const kind = computed(() => {
  const mime = props.row.content_type.toLowerCase()
  const ext = props.row.name.split('.').pop()?.toLowerCase() || ''
  if (mime.startsWith('image/')) return {name: 'image', label: '图片', icon: Picture}
  if (mime.startsWith('video/') || ['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(ext)) return {name: 'video', label: '视频', icon: VideoCamera}
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) return {name: 'audio', label: '音频', icon: Headset}
  if (mime === 'application/pdf' || ext === 'pdf') return {name: 'pdf', label: 'PDF', icon: Document}
  if (['xls', 'xlsx', 'csv'].includes(ext)) return {name: 'sheet', label: '表格', icon: Tickets}
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return {name: 'archive', label: '压缩包', icon: Folder}
  if (mime.startsWith('text/') || ['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return {name: 'document', label: '文档', icon: Document}
  return {name: 'file', label: '文件', icon: Files}
})
const title = computed(() => props.row.status !== 'ready' ? '文件尚未上传完成'
    : filePreviewKind(props.row) ? '点击预览：' + props.row.name : '点击下载：' + props.row.name)

async function loadThumbnail() {
  if (!visible || !isImage.value || props.row.status !== 'ready') return
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  failed.value = false
  try {
    const link = await SysFileApi.Link(props.row.id, true, request.signal)
    if (!request.signal.aborted) url.value = link
  } catch {
    if (!request.signal.aborted) failed.value = true
  } finally {
    if (controller === request) loading.value = false
  }
}
function open() {
  if (props.row.status !== 'ready') return
  if (filePreviewKind(props.row)) {
    // 大图通过页面重新获取链接，避免复用已过期的缩略图签名。
    emit('preview', props.row)
  } else emit('download', props.row)
}
watch(() => [props.row.id, props.row.updated_at, props.row.status, props.row.content_type], () => {
  controller?.abort()
  url.value = ''
  failed.value = false
  loading.value = false
  void loadThumbnail()
})
onMounted(() => {
  if (!element.value) return
  observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return
    visible = true
    observer?.disconnect()
    void loadThumbnail()
  })
  observer.observe(element.value)
})
onBeforeUnmount(() => { observer?.disconnect(); controller?.abort() })
</script>

<style scoped>
.file-preview {
  width: 60px;
  height: 60px;
  padding: 0;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  cursor: pointer;
  vertical-align: middle;
  transition: border-color .2s;
}
.file-preview:hover:not(:disabled), .file-preview:focus-visible {
  border-color: var(--el-color-primary);
}
.file-preview:disabled { cursor: default; opacity: .6; }
.file-preview img { width: 100%; height: 100%; object-fit: cover; }
.file-preview span { font-size: 11px; line-height: 14px; }
.image, .document { color: var(--el-color-primary); }
.video, .pdf { color: var(--el-color-danger); }
.audio, .sheet { color: var(--el-color-success); }
.archive { color: var(--el-color-warning); }
</style>

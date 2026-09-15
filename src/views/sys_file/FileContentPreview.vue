<template>
  <el-dialog :model-value="true" :title="file.name" width="min(1000px, 94vw)" class="file-content-preview"
             :close-on-click-modal="false" :close-on-press-escape="true" @close="emit('close')">
    <div v-if="loading" class="preview-loading"><el-text>正在获取预览内容…</el-text></div>
    <div v-if="error" class="mb-[12px]">
      <el-alert :title="error" type="warning" :closable="false" show-icon/>
    </div>
    <template v-if="url && !loading">
      <el-image v-if="kind === 'image'" class="preview-image" :src="url" fit="contain"
                :preview-src-list="[url]" preview-teleported @error="contentError"/>
      <video v-else-if="kind === 'video'" class="preview-media" :src="url" controls playsinline
             preload="metadata" @error="contentError"/>
      <audio v-else-if="kind === 'audio'" class="preview-audio" :src="url" controls preload="metadata" @error="contentError"/>
      <iframe v-else-if="kind === 'pdf'" class="preview-pdf" :src="url" title="PDF 预览"
              sandbox="allow-scripts" referrerpolicy="no-referrer"/>
      <pre v-else-if="kind === 'text'" class="preview-text">{{ text }}</pre>
    </template>
    <el-text v-if="truncated" type="info">仅预览前 256 KiB 内容，完整内容请下载查看。</el-text>
    <el-text v-if="kind === 'pdf'" type="info">PDF 预览依赖浏览器支持；若无法显示，请下载查看。</el-text>
    <template #footer>
      <el-button @click="emit('close')">关闭</el-button>
      <el-button v-if="error" :loading="loading" @click="load">重试</el-button>
      <a v-if="kind === 'pdf' && url" :href="url" target="_blank" rel="noopener noreferrer" class="preview-open">在新窗口预览 PDF</a>
      <el-button type="primary" icon="Download" @click="emit('download', file)">下载文件</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {SysFileApi, type ManagedFile} from '../../apis/sys_file'
import {filePreviewKind} from './fileTypes'

const props = defineProps<{file: ManagedFile}>()
const emit = defineEmits<{close: []; download: [file: ManagedFile]}>()
const kind = computed(() => filePreviewKind(props.file))
const url = ref('')
const text = ref('')
const loading = ref(false)
const error = ref('')
const truncated = ref(false)
let controller: AbortController | undefined

function contentError() {
  error.value = '预览加载失败，链接可能已过期或浏览器不支持此文件格式，可重试或下载查看'
}
async function load() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = ''
  url.value = ''
  text.value = ''
  truncated.value = false
  try {
    const link = await SysFileApi.Link(props.file.id, true, request.signal)
    if (request.signal.aborted) return
    url.value = link
    if (kind.value === 'text') {
      // 签名地址自身携带访问凭证，不向存储域名发送后台 Authorization。
      const response = await fetch(link, {signal: request.signal, credentials: 'omit', referrerPolicy: 'no-referrer'})
      if (!response.ok || !response.body) throw new Error('无法读取文件')
      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      const limit = 256 * 1024
      let size = 0
      try {
        while (size <= limit) {
          const {done, value} = await reader.read()
          if (request.signal.aborted) return
          if (done) break
          const take = Math.min(value.byteLength, limit - size)
          text.value += decoder.decode(value.subarray(0, take), {stream: true})
          size += value.byteLength
          if (size > limit) { truncated.value = true; break }
        }
        if (!request.signal.aborted) text.value += decoder.decode()
      } finally {
        await reader.cancel().catch(() => {})
        reader.releaseLock()
      }
    }
  } catch {
    if (!request.signal.aborted) {
      error.value = kind.value === 'text'
          ? '文本读取失败，请确认存储允许当前站点跨域读取，或下载查看'
          : '预览地址获取失败，请重试或下载查看'
      url.value = ''
    }
  } finally {
    if (controller === request) loading.value = false
  }
}
onMounted(load)
onBeforeUnmount(() => controller?.abort())
</script>

<style scoped>
.preview-open { color: var(--el-color-primary); margin: 0 12px; text-decoration: none; }
.preview-loading { padding: 40px; text-align: center; }
.preview-image, .preview-media { display: block; width: 100%; max-height: 65vh; }
.preview-image { height: 60vh; }
.preview-audio { width: 100%; margin: 24px 0; }
.preview-pdf { width: 100%; height: 65vh; border: 1px solid var(--el-border-color-lighter); border-radius: 6px; }
.preview-text {
  max-height: 65vh;
  overflow: auto;
  margin: 0 0 12px;
  padding: 16px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font: 13px/1.6 monospace;
  white-space: pre;
}
</style>

<template>
  <el-card class="container" shadow="never">
    <PageHeader title="文件列表" description="集中管理上传文件，支持大文件分片、断点续传与安全下载"/>
    <el-form class="search-form" @submit.prevent="handleSearch">
      <el-input v-model="search.name" size="large" clearable placeholder="搜索文件名" prefix-icon="Search" @blur="handleSearch" @clear="handleSearch"/>
      <el-input v-model="search.username" size="large" clearable placeholder="搜索上传账号" @blur="handleSearch" @clear="handleSearch"/>
      <el-select v-model="search.engine" size="large" clearable value-on-clear="" placeholder="全部存储引擎" @change="handleSearch">
        <el-option v-for="(label, value) in engines" :key="value" :label="label" :value="value"/>
      </el-select>
      <el-select v-model="search.storage_id" size="large" clearable value-on-clear="" placeholder="全部存储账号" @change="handleSearch">
        <el-option v-for="account in storages" :key="account.id" :label="account.name" :value="String(account.id)"/>
      </el-select>
      <el-select v-model="search.status" size="large" clearable value-on-clear="" placeholder="全部状态" @change="handleSearch">
        <el-option label="已完成" value="ready"/><el-option label="未完成" value="uploading"/>
      </el-select>
      <el-button icon="RefreshLeft" @click="resetSearch">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" type="error" show-icon/>
    </div>
    <ColumnTable v-loading="loading" :data="rows" row-key="id" size="large"
                 storage-key="core/views/sys_file/index:table-1" @sort-change="sortChange"
                 @selection-change="(items: ManagedFile[]) => selectedIds = items.map(item => item.id)">
      <template #toolbar>
        <el-button v-if="!selectedIds.length" :loading="loading" icon="Refresh" @click="load">刷新</el-button>
        <el-button v-if="!selectedIds.length" type="primary" icon="Upload" :disabled="!policy" @click="openUpload()">上传文件</el-button>
        <el-button v-if="!selectedIds.length" icon="Delete" :disabled="deleting" @click="cleanupOpen = true">清理过期上传</el-button>
        <el-button v-if="selectedIds.length" type="danger" icon="Delete" :disabled="deleting" @click="remove(selectedIds)">批量删除</el-button>
      </template>
      <el-table-column type="selection" width="48"/>
      <el-table-column prop="id" label="编号" sortable="custom" width="90"/>
      <el-table-column column-key="preview" label="预览" width="100" align="center">
        <template #default="{row}">
          <FilePreview :row="row" @preview="preview" @download="download"/>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="文件名" min-width="220" show-overflow-tooltip/>
      <el-table-column prop="size" label="大小" sortable="custom" width="130">
        <template #default="{row}">{{ formatFileSize(row.size) }}</template>
      </el-table-column>
      <el-table-column prop="storage_name" label="存储账号" min-width="140" show-overflow-tooltip/>
      <el-table-column prop="engine" label="存储引擎" width="120">
        <template #default="{row}"><el-tag effect="light" type="info">{{ engines[row.engine] || row.engine }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="110">
        <template #default="{row}">
          <el-tag :type="row.status === 'ready' ? 'success' : 'warning'">{{ row.status === 'ready' ? '已完成' : expired(row) ? '已过期' : '未完成' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="content_type" label="文件类型" min-width="160" show-overflow-tooltip/>
      <el-table-column prop="username" label="上传账号" min-width="120" show-overflow-tooltip/>
      <el-table-column prop="created_at" label="创建时间" sortable="custom" width="170">
        <template #default="{row}"><TableTime :value="row.created_at"/></template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" align="center" width="270">
        <template #default="{row}">
          <div class="table-btn-group">
            <el-button v-if="row.status === 'ready' && previewable(row)" icon="View" plain size="small" type="primary" @click="preview(row)">预览</el-button>
            <el-button v-if="row.status === 'ready'" icon="Download" plain size="small" type="primary" @click="download(row)">下载</el-button>
            <el-button v-if="row.status === 'uploading' && row.multipart && row.is_owner && !expired(row)" icon="Upload" plain size="small" type="primary" @click="openUpload(row)">继续上传</el-button>
            <el-button icon="Delete" plain size="small" type="danger" :disabled="deleting" @click="remove([row.id])">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty v-if="!loading" :image-size="70" :description="listError ? '加载失败，请刷新重试' : '暂无文件'"/>
      </template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination v-model:current-page="query.page" v-model:page-size="query.limit" :total="total"
                     :page-sizes="[10,30,50,100]" background layout="total, sizes, prev, pager, next, jumper"/>
    </div>
    <FormDialog v-model="cleanupOpen" title="清理过期上传" description="按各会话的到期时间清理未完成的上传记录和分片，已完成文件不受影响。"
                note-icon="Delete" confirm-btn-type="danger" confirm-btn-text="确认清理" :on-confirm="cleanup">
      <el-alert :closable="false" title="清理后需要重新上传文件，不能继续原来的上传会话。" type="warning" show-icon/>
    </FormDialog>
    <el-drawer v-model="uploadOpen" title="上传文件" :size="520" :close-on-click-modal="false"
               :close-on-press-escape="true" @closed="load">
      <FileUpload v-if="uploadOpen && policy" :target="target" :policy="policy" :storages="storages"
                  :auto-upload="false" @changed="load" @cancelled="uploadOpen = false"
                  @success="ElMessage.success('文件上传成功')"/>
    </el-drawer>
    <FileContentPreview v-if="previewTarget" :key="previewTarget.id" :file="previewTarget"
                        @close="previewTarget = undefined" @download="download"/>
  </el-card>
</template>

<script setup lang="ts">
import {h, onMounted, onBeforeUnmount, ref, watch} from "vue";
import {ElCheckbox, ElMessage} from "element-plus";
import ColumnTable from "../../components/ColumnTable.vue";
import PageHeader from "../../components/PageHeader.vue";
import TableTime from "../../components/TableTime.vue";
import FormDialog from "../../components/FormDialog.vue";
import {confirmDelete} from "../../utils/confirmDelete";
import {SysFileApi, formatFileSize, type ManagedFile, type FileQuery, type UploadPolicy} from "../../apis/sys_file";
import FileUpload from "../../components/FileUpload.vue";
import FilePreview from "./FilePreview.vue";
import FileContentPreview from "./FileContentPreview.vue";
import {filePreviewKind} from "./fileTypes";
import {storageEngines, type StorageOption} from "../../apis/sys_storage";

const engines = storageEngines
const storages = ref<StorageOption[]>([])
const emptySearch = () => ({name: '', username: '', engine: '', status: '', storage_id: ''})
const search = ref(emptySearch())
const query = ref<FileQuery>({page: 1, limit: 10, filters: [], sorts: []})
const rows = ref<ManagedFile[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])
const loading = ref(false)
const deleting = ref(false)
const listError = ref('')
const policy = ref<UploadPolicy>()
const uploadOpen = ref(false)
const cleanupOpen = ref(false)
const target = ref<ManagedFile>()
const previewTarget = ref<ManagedFile>()
let requestId = 0

async function load() {
  const current = ++requestId
  loading.value = true
  listError.value = ''
  selectedIds.value = []
  try {
    const response = await SysFileApi.List({...query.value})
    if (current !== requestId) return
    rows.value = response.data.list || []
    total.value = response.data.total
    policy.value = response.data.policy
    storages.value = response.data.storages
  } catch {
    if (current !== requestId) return
    rows.value = []
    total.value = 0
    listError.value = '文件列表加载失败，请刷新重试'
  } finally {
    if (current === requestId) loading.value = false
  }
}
function handleSearch() {
  const filters: FileQuery['filters'] = []
  for (const field of ['name', 'username', 'engine', 'status', 'storage_id'] as const) {
    const value = search.value[field].trim()
    if (value) filters.push({field, operator: field === 'name' || field === 'username' ? 'like' : '=', value})
  }
  query.value = {...query.value, page: 1, filters}
}
function resetSearch() { search.value = emptySearch(); handleSearch() }
function sortChange({prop, order}: {prop: string; order: string | null}) {
  query.value = {...query.value, page: 1, sorts: order && ['id','size','created_at'].includes(prop)
      ? [{field: prop, order: order === 'ascending' ? 'asc' : 'desc'}] : []}
}
function openUpload(row?: ManagedFile) { target.value = row; uploadOpen.value = true }
function expired(row: ManagedFile) { return !!row.expires_at && Date.parse(row.expires_at) <= Date.now() }
function previewable(row: ManagedFile) { return !!filePreviewKind(row) }
function preview(row: ManagedFile) { previewTarget.value = row }
async function download(row: ManagedFile) {
  try {
    const link = document.createElement('a')
    link.href = await SysFileApi.Link(row.id)
    link.download = row.name
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch { /* 请求层统一提示。 */ }
}
async function remove(ids: number[]) {
  const targets = [...ids]
  const recordsOnly = ref(false)
  await confirmDelete({
    subject: '文件', count: targets.length,
    description: '同时删除文件记录、原存储中的文件和未完成分片。业务中引用的文件也将无法访问。',
    extraContent: () => h('div', [
      h(ElCheckbox, {
        modelValue: recordsOnly.value, disabled: deleting.value,
        'onUpdate:modelValue': (value: string | number | boolean) => { recordsOnly.value = value === true },
      }, () => '仅删除记录（存储无法访问时使用）'),
      recordsOnly.value ? h('p', {class:'text-[12px] text-[var(--el-color-warning)]'},
          '不会删除存储中的文件或分片，请自行清理；删除记录后无法继续上传。') : null,
    ]),
    onConfirm: async () => {
      deleting.value = true
      try { await SysFileApi.Delete(targets, recordsOnly.value); ElMessage.success(recordsOnly.value ? '文件记录已删除' : '文件已删除') }
      finally { deleting.value = false; await load() }
    },
  })
}
async function cleanup() {
  deleting.value = true
  try {
    const response = await SysFileApi.Cleanup()
    ElMessage.success('已清理 ' + response.data.count + ' 条上传会话')
  } finally { deleting.value = false; await load() }
}
watch(query, load, {deep: true})
onMounted(load)
onBeforeUnmount(() => { requestId++ })
</script>

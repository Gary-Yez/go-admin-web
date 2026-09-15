<template>
  <FormDialog v-model="cleanupShow" :max-width="900" :on-confirm="handleConfirm" confirm-btn-text="确认清理" confirm-btn-type="danger"
              size="default" title="清理失效 API">
    <template #default>
      <DeleteNotice :count="tableData.length" description="清理所列接口记录及对应角色授权，不会修改后端路由代码。"
                    subject="失效 API"/>
      <div v-if="listError" class="mb-[12px]">
        <el-alert :closable="false" :title="listError" show-icon type="error"/>
      </div>
      <el-card header="失效 API" shadow="never">
        <ColumnTable v-loading="pageLoading || deleting" :column-settings="false" :data="tableData"
                     size="large" storage-key="core/views/sys_apis/cleanup_api:table-1">
          <template #toolbar>
            <el-button :disabled="deleting" :loading="pageLoading" icon="Refresh" @click="getPageData">刷新</el-button>
          </template>
          <el-table-column label="API路径" prop="path"></el-table-column>
          <el-table-column label="分组" prop="group"></el-table-column>
          <el-table-column label="描述" prop="description"></el-table-column>
          <el-table-column :width="100" label="请求" prop="method">
            <template #default="{ row }">
              <el-tag :type="MethodType[row.method] || 'warning'">{{ row.method }}</el-tag>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : '没有需要清理的失效 API'"
                      :image-size="70"/>
          </template>
        </ColumnTable>
      </el-card>
    </template>
  </FormDialog>
</template>

<script lang="ts" setup>
import DeleteNotice from "../../components/DeleteNotice.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import {ref} from "vue";
import {SysApisApi} from "../../apis/sys_apis";
import {ElMessage} from "element-plus";
import {MethodType} from "./method_type";
import FormDialog from "../../components/FormDialog.vue";

const emits = defineEmits(["cleaned"])
const cleanupShow = ref(false)
const pageLoading = ref(false)
const deleting = ref(false)
const listError = ref('')
const tableData = ref<Array<{ id: number, path: string, method: string, group: string, description: string }>>([])
let listRequest = 0

const getPageData = async () => {
  if (deleting.value) return
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  try {
    const response = await SysApisApi.GetInvalidAPIs()
    if (request !== listRequest) return
    tableData.value = response.data ?? []
  } catch (error) {
    if (request !== listRequest) return
    tableData.value = []
    listError.value = '失效 API 加载失败，请点击刷新重试'
    console.error(error)
  } finally {
    if (request === listRequest) pageLoading.value = false
  }
}

const handleConfirm = async () => {
  if (pageLoading.value || listError.value || deleting.value) {
    ElMessage.warning('请等待列表加载成功后再清理')
    throw new Error('清理列表尚未就绪')
  }
  deleting.value = true
  try {
    const ids = tableData.value.map(item => item.id)
    if (ids.length > 0) {
      await SysApisApi.Delete(ids)
      tableData.value = []
      ElMessage.success('失效 API 已清理')
    } else {
      ElMessage.info('没有需要清理的失效 API')
    }
    emits('cleaned')
  } finally {
    deleting.value = false
  }
}

defineExpose({
  show() {
    cleanupShow.value = true
    getPageData()
  }
})
</script>

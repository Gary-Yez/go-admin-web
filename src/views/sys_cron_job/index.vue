<template>
  <el-card class="container" shadow="never">
    <PageHeader description="配置执行计划，查看任务状态与运行记录" title="计划任务"/>
    <div v-if="listError" class="mb-[12px]">
      <el-alert :closable="false" :title="listError" show-icon type="error"/>
    </div>
    <ColumnTable v-loading="pageLoading" :data="tableData"
                 size="large" storage-key="core/views/sys_cron_job/index:table-1" @sort-change="handleSortChange" @selection-change="handleSelectionChange">
      <template #toolbar>
        <el-button v-if="multipleSelection.length <= 0" :loading="pageLoading" icon="Refresh" @click="getPageData">
          刷新
        </el-button>
        <el-button v-if="multipleSelection.length <= 0" icon="Plus" type="primary"
                   @click="()=>handleAdd({enable:true})">新增
        </el-button>
        <el-button v-if="multipleSelection.length > 0" icon="Delete" type="danger"
                   @click="()=>handleDelete(multipleSelection)">批量删除
        </el-button>
      </template>
      <el-table-column type="selection"></el-table-column>
      <el-table-column :width="100" label="编号" prop="id" sortable="custom"></el-table-column>
      <el-table-column label="名称" prop="name"></el-table-column>
      <el-table-column label="执行任务" prop="handler_key">
        <template #default="{ row }">
          <el-tag v-if="handlers[row.handler_key]">{{ handlers[row.handler_key]?.name }}</el-tag>
          <el-tag v-else type="warning">未注册（{{ row.handler_key }}）</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="执行周期" prop="cron">
        <template #default="{ row }">
          <span class="text-[14px]">{{ transSpecToStr(row.cron) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="是否启用" prop="enable">
        <template #default="{ row }">
          <el-tag v-if="row.enable" type="success">运行中</el-tag>
          <el-tag v-else type="danger">未运行</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近执行时间" prop="last_run_time">
        <template #default="{ row }">
          <TableTime :value="row.last_run_time"/>
        </template>
      </el-table-column>
      <el-table-column label="下次执行时间" prop="next_run_time">
        <template #default="{ row }">
          <TableTime :value="row.next_run_time"/>
        </template>
      </el-table-column>
      <el-table-column :width="300" align="center" fixed="right" label="操作">
        <template #default="{ row }">
          <div class="table-btn-group">
            <el-button icon="Edit" plain size="small" type="primary" @click="()=>handleAdd(row)">编辑</el-button>
            <el-button icon="Tickets" plain size="small" type="primary" @click="()=>handleShowLog(row)">查看日志
            </el-button>
            <el-button icon="Delete" plain size="small" type="danger" @click="()=>handleDelete([row.id])">删除
            </el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty v-if="!pageLoading" :description="listError ? '加载失败，请刷新重试' : '暂无计划任务'"
                  :image-size="70"/>
      </template>
    </ColumnTable>
    <div class="table-pagination">
      <el-pagination
          v-model:current-page="queryForm.page"
          v-model:page-size="queryForm.limit"
          :page-sizes="[10, 30, 50, 100]"
          :total="total"
          background
          layout="total, sizes, prev, pager, next, jumper"

      />
    </div>
    <FormDialog v-model="dialogOpen" v-model:form="submitForm"
                :on-confirm="handleSubmit" :title="`${ submitForm.id ? '修改' : '新增' }计划任务`" description="选择执行任务并设置运行计划，可通过执行日志查看运行结果。"
                note-icon="Clock">
      <el-form-item :rules="[{required:true,message:'名称不能为空'}]" label="名称" prop="name">
        <el-input v-model="submitForm.name" placeholder="请输入名称" size="large"></el-input>
      </el-form-item>
      <el-form-item :rules="[{required:true,message:'执行任务不能为空'}]" label="执行任务" prop="handler_key">
        <el-select v-model="submitForm.handler_key" size="large">
          <el-option v-for="(handler,key) in handlers" :label="handler.name" :value="key"></el-option>
        </el-select>
      </el-form-item>
      <template v-if="handlers[submitForm.handler_key]?.params">
        <el-form-item v-for="item in handlers[submitForm.handler_key]?.params" :key="`${submitForm.handler_key}:${item.key}`" :label="item.name"
                      :prop="['params', item.key]" :rules="paramRules(item)">
          <el-input v-if="item.type === 'string'" v-model="submitForm.params[item.key]" :placeholder="`请输入${item.name}`"
                    size="large"></el-input>
          <el-input-number v-if="item.type === 'int'" v-model="submitForm.params[item.key]" :placeholder="item.name"
                           size="large"></el-input-number>
          <el-switch v-if="item.type === 'bool'" v-model="submitForm.params[item.key]" :active-value="true"
                     :inactive-value="false"></el-switch>
          <div v-if="item.type === 'array'" class="w-full">
            <el-select v-model="submitForm.params[item.key]" :loading="paramOptions[item.key]?.loading"
                       :placeholder="`请选择${item.name}`" class="w-full" clearable filterable multiple
                       loading-text="正在加载选项" no-data-text="暂无可选项" no-match-text="没有匹配的选项" size="large">
              <el-option v-for="option in displayOptions(item)" :key="`${typeof option.value}:${option.value}`"
                         :label="option.label" :value="option.value"/>
            </el-select>
            <div v-if="paramOptions[item.key]?.error" class="mt-[6px] text-[var(--el-color-danger)]" role="alert">
              {{ paramOptions[item.key]?.error }}
              <el-button link type="primary" @click="loadParamOptions(item)">重试</el-button>
            </div>
            <div v-else-if="paramOptions[item.key]?.loaded && !paramOptions[item.key]?.options.length"
                 class="mt-[6px] text-[var(--el-text-color-secondary)]">暂无可选项</div>
          </div>
          <div v-if="item.description" class="mt-[6px] w-full text-[var(--el-text-color-secondary)]">{{ item.description }}</div>
        </el-form-item>
      </template>
      <el-form-item label="执行时区">
        <span>{{
            submitForm.timezone === 'Asia/Shanghai' ? '北京时间（Asia/Shanghai）' : submitForm.timezone || '北京时间'
          }}</span>
      </el-form-item>
      <el-form-item :rules="[{validator:checkCron}]" label="执行周期" prop="cron">
        <el-row :gutter="10" class="w-full">
          <el-col :span="6">
            <el-select v-model="submitForm.specType" class="w-full" size="large">
              <el-option v-for="(item,key) in cronMethod" :label="item.label" :value="key"></el-option>
            </el-select>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'week')" :span="6">
            <el-select v-model="submitForm.week" size="large">
              <el-option v-for="(value,index) in weeks" :label="value" :value="index + 1"></el-option>
            </el-select>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'day')" :span="6">
            <el-input-number v-model="submitForm.day" :controls="false" :max="31" :min="1" :value-on-clear="1"
                             class="w-[100%!important]" size="large">
              <template #suffix>日</template>
            </el-input-number>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'hour')" :span="6">
            <el-input-number v-model="submitForm.hour" :controls="false" :max="24" :min="0"
                             :value-on-clear="0" class="w-[100%!important]" size="large">
              <template #suffix>小时</template>
            </el-input-number>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'minute')" :span="6">
            <el-input-number v-model="submitForm.minute" :controls="false" :max="59" :min="submitForm.specType =='perNMinute' ? 1 : 0 "
                             :value-on-clear="submitForm.specType =='perNMinute' ? 1 : 0" class="w-[100%!important]"
                             size="large">
              <template #suffix>分钟</template>
            </el-input-number>
          </el-col>
          <el-col v-if="needShow(submitForm.specType,'second')" :span="6">
            <el-input-number v-model="submitForm.second" :controls="false" :max="3600" :min="1"
                             :value-on-clear="1" class="w-[100%!important]" size="large">
              <template #suffix>秒</template>
            </el-input-number>
          </el-col>
        </el-row>
      </el-form-item>
      <el-form-item label="是否启用" prop="enable">
        <el-switch v-model="submitForm.enable" :active-value="true" :inactive-value="false"></el-switch>
      </el-form-item>
    </FormDialog>
    <Logs ref="logRef"></Logs>
  </el-card>
</template>

<script lang="ts" setup>
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import {confirmDelete} from "../../utils/confirmDelete";
import TableTime from "../../components/TableTime.vue";
import PageHeader from "../../components/PageHeader.vue";
import ColumnTable from "../../components/ColumnTable.vue";
import {SysCronJobApi} from "../../apis/sys_cron_job";
import type {CronHandler, CronParam, CronParamOption} from "../../apis/sys_cron_job";
import {ElMessage} from "element-plus";
import FormDialog from "../../components/FormDialog.vue";
import {cronMethod, needShow, transObjToSpec, transSpecToObj, transSpecToStr, weeks} from "./helper";
import Logs from "./logs.vue";

const logRef = ref();
const dialogOpen = ref(false)
const queryForm = ref({
  page: 1,
  sorts: [] as Array<{ field: string; order: string }>,
  limit: 10
})
const listError = ref('')
let listRequest = 0
const pageLoading = ref(true)
const total = ref(0)
const multipleSelection: any = ref([])
const handlers = ref<Record<string, CronHandler>>({})
const tableData = ref([])
const submitForm: any = ref({})
const paramOptions = ref<Record<string, {
  options: CronParamOption[]
  loading: boolean
  loaded: boolean
  error: string
}>>({})
const optionRequests = new Map<string, AbortController>()
let optionsVersion = 0

const cancelOptionRequests = () => {
  ++optionsVersion
  optionRequests.forEach(controller => controller.abort())
  optionRequests.clear()
}

const loadParamOptions = async (param: CronParam) => {
  const handlerKey = submitForm.value.handler_key
  const version = optionsVersion
  optionRequests.get(param.key)?.abort()
  const controller = new AbortController()
  optionRequests.set(param.key, controller)
  paramOptions.value[param.key] = {options: [], loading: true, loaded: false, error: ''}
  const isCurrent = () => version === optionsVersion && optionRequests.get(param.key) === controller
  try {
    const response = await SysCronJobApi.GetParamOptions(handlerKey, param.key, controller.signal)
    if (!isCurrent()) return
    paramOptions.value[param.key] = {options: response.data, loading: false, loaded: true, error: ''}
  } catch (error) {
    if (!isCurrent()) return
    const message = typeof error === 'string' ? error : error instanceof Error ? error.message : ''
    paramOptions.value[param.key] = {options: [], loading: false, loaded: false, error: message || '选项加载失败，请重试'}
  } finally {
    if (isCurrent()) optionRequests.delete(param.key)
  }
}

// 保留不在最新选项中的历史值；不把数字转成字符串，也不自动删掉已选值。
const displayOptions = (param: CronParam): CronParamOption[] => {
  const state = paramOptions.value[param.key]
  const options = [...(state?.options ?? [])]
  const selected = submitForm.value.params?.[param.key]
  if (Array.isArray(selected)) {
    for (const value of selected) {
      if (['string', 'number', 'boolean'].includes(typeof value) && !options.some(option => option.value === value)) {
        options.push({value, label: state?.loaded ? `未在最新选项中找到（${value}）` : `已选值（${value}）`})
      }
    }
  }
  return options
}

const paramRules = (param: CronParam) => [{
  required: param.required,
  trigger: 'change',
  validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
    const missing = value === undefined || value === null
    let message = ''
    if (param.required && (missing || value === '' || (Array.isArray(value) && value.length === 0))) {
      message = `${param.name}是必需的`
    } else if (param.type === 'array' && value !== undefined) {
      const validItem = (item: unknown) => param.item_type === 'int' ? Number.isSafeInteger(item)
          : param.item_type === 'string' ? typeof item === 'string'
              : param.item_type === 'bool' && typeof item === 'boolean'
      if (!Array.isArray(value) || !value.every(validItem)) message = `${param.name}必须是元素类型正确的数组，整数需在安全范围内`
    } else if (!missing && ((param.type === 'int' && !Number.isInteger(value))
        || (param.type === 'string' && typeof value !== 'string')
        || (param.type === 'bool' && typeof value !== 'boolean'))) {
      message = `${param.name}的类型不正确`
    }
    callback(message ? new Error(message) : undefined)
  },
}]

watch([dialogOpen, () => submitForm.value.handler_key], ([open, key], [wasOpen, previousKey]) => {
  cancelOptionRequests()
  paramOptions.value = {}
  if (!open || !key) return
  if (wasOpen && key !== previousKey) submitForm.value.params = {}
  for (const param of handlers.value[key]?.params ?? []) {
    if (submitForm.value.params[param.key] === undefined) {
      if (param.type === 'array') submitForm.value.params[param.key] = []
      if (param.type === 'bool') submitForm.value.params[param.key] = false
    }
    if (param.type === 'array') void loadParamOptions(param)
  }
}, {flush: 'sync'})

onBeforeUnmount(cancelOptionRequests)

const checkCron = (_rule: any, _value: any, callback: any) => {
  let result = transObjToSpec(
      submitForm.value.specType,
      submitForm.value.week,
      submitForm.value.day,
      submitForm.value.hour,
      submitForm.value.minute,
      submitForm.value.second,
      submitForm.value.timezone,
  )
  if (!result) {
    callback("执行周期设置不正确，请检查")
  } else {
    callback()
  }
}


const getPageData = async () => {
  const request = ++listRequest
  pageLoading.value = true
  listError.value = ''
  multipleSelection.value = []
  try {
    const [response, handlerResponse] = await Promise.all([
      SysCronJobApi.List({...queryForm.value}),
      SysCronJobApi.GetRegisteredHandler(),
    ])
    if (request !== listRequest) return
    handlers.value = handlerResponse.data ?? {}
    tableData.value = response.data.list ?? []
    total.value = response.data.total
  } catch (error) {
    if (request !== listRequest) return
    tableData.value = []
    total.value = 0
    listError.value = '列表加载失败，请点击刷新重试'
    console.error(error)
  } finally {
    if (request === listRequest) pageLoading.value = false
  }
}


const handleSelectionChange = (val: Array<any>) => {
  multipleSelection.value = val.map(item => item.id)
}

const handleAdd = (defaultForm: any) => {
  let params: Record<string, unknown>
  try {
    params = defaultForm.params ? JSON.parse(defaultForm.params) ?? {} : {}
    if (typeof params !== 'object' || Array.isArray(params)) throw new Error('invalid params')
  } catch {
    ElMessage.error('任务参数不是有效的 JSON 对象，请检查历史数据')
    return
  }
  submitForm.value = {
    ...defaultForm,
    params,
    ...transSpecToObj(defaultForm.cron),
    max_concurrency: defaultForm.max_concurrency || 1
  }
  dialogOpen.value = true
}

const handleShowLog = (row: any) => {
  // logsOpen.value = true
  logRef.value.showLog(row)
}

const handleDelete = (ids: Array<any>) => confirmDelete({
  subject: "计划任务",
  count: ids.length,
  description: "删除后不再安排该任务的新批次，已经开始的执行不会因此中止。",
  onConfirm: async () => {
    await SysCronJobApi.Delete(ids)
    ElMessage.success("删除成功")
    await getPageData()
  },
})

const handleSubmit = async () => {
  submitForm.value.cron = transObjToSpec(
      submitForm.value.specType,
      submitForm.value.week,
      submitForm.value.day,
      submitForm.value.hour,
      submitForm.value.minute,
      submitForm.value.second,
      submitForm.value.timezone,
  )
  if (!submitForm.value.id) {
    await SysCronJobApi.Create(submitForm.value)
    ElMessage.success("创建成功")
  } else {
    await SysCronJobApi.Edit(submitForm.value)
    ElMessage.success("修改成功")
  }
  getPageData()
}

onMounted(() => {
  getPageData()
})
const handleSortChange = ({prop, order}: { prop: string; order: 'ascending' | 'descending' | null }) => {
  queryForm.value.sorts = ['id'].includes(prop) && order ? [{
    field: prop,
    order: order === 'ascending' ? 'asc' : 'desc'
  }] : []
  queryForm.value.page = 1
}
watch(queryForm, () => {
  getPageData()
}, {deep: true})
</script>


<style scoped>

</style>

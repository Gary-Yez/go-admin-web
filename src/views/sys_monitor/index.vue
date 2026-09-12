<template>
  <el-card class="container" shadow="never">
    <PageHeader title="节点监控" description="查看各实例的机器资源与 Go 运行状态，每 5 秒更新一次">
      <el-tag effect="plain">{{ updatedAt ? `最近刷新 ${updatedAt}` : '等待采集' }}</el-tag>
    </PageHeader>
    <div class="monitor-summary">
      <div><span>在线节点</span><strong class="online">{{ online.length }}</strong></div>
      <div><span>离线节点</span><strong :class="{'offline':offlineCount > 0}">{{ offlineCount }}</strong></div>
      <div><span>在线进程内存合计</span><strong>{{ online.length ? bytes(totalRSS) : '—' }}</strong></div>
      <div><span>在线 Goroutine 合计</span><strong>{{ online.reduce((sum,row)=>sum+row.goroutines,0).toLocaleString() }}</strong></div>
    </div>
    <el-form class="search-form" @submit.prevent>
      <el-input v-model="searchInput" size="large" clearable prefix-icon="Search" placeholder="搜索节点或主机名" @blur="search = searchInput.trim()" @clear="search = ''" />
      <el-select v-model="status" size="large" placeholder="全部状态" clearable><el-option label="在线" value="online"/><el-option label="离线" value="offline"/></el-select>
      <el-button icon="RefreshLeft" @click="resetSearch">重置</el-button>
    </el-form>
    <div v-if="listError" class="mb-[12px]"><el-alert :title="listError" type="error" :closable="false" show-icon /></div>
    <ColumnTable storage-key="core/views/sys_monitor/index:table-1" :data="filtered" row-key="id" size="large" v-loading="loading">
      <template #toolbar>
        <el-button icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        <el-switch v-model="autoRefresh" active-text="自动刷新" @change="updateRefresh" />
      </template>
      <el-table-column prop="name" label="节点" min-width="190"><template #default="{row}"><div class="node-name">{{ row.name }}</div><span class="muted">{{ row.hostname }} · PID {{ row.pid }}</span></template></el-table-column>
      <el-table-column prop="online" label="状态" width="90"><template #default="{row}"><el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? '在线' : '离线' }}</el-tag></template></el-table-column>
      <el-table-column prop="cpu" label="机器 CPU" min-width="145"><template #default="{row}"><el-progress v-if="row.cpu !== null" :percentage="Math.min(100,Number(row.cpu.toFixed(1)))" :stroke-width="6" :status="row.cpu >= 85 ? 'exception' : undefined"/><span v-else class="muted">采集中或不可用</span></template></el-table-column>
      <el-table-column prop="memory_percent" label="机器内存" min-width="145"><template #default="{row}"><el-progress v-if="row.memory_percent !== null" :percentage="Math.min(100,Number(row.memory_percent.toFixed(1)))" :stroke-width="6"/><span v-else>不可用</span></template></el-table-column>
      <el-table-column prop="process_cpu" label="进程 CPU" width="115"><template #default="{row}">{{ percent(row.process_cpu) }}</template></el-table-column>
      <el-table-column prop="rss" label="进程内存" width="120"><template #default="{row}">{{ bytes(row.rss) }}</template></el-table-column>
      <el-table-column prop="goroutines" label="Goroutine" width="120" />
      <el-table-column prop="uptime" label="运行时长" min-width="120"><template #default="{row}">{{ duration(row.uptime) }}</template></el-table-column>
      <el-table-column prop="last_seen" label="最后上报" min-width="150"><template #default="{row}"><TableTime :value="row.last_seen"/></template></el-table-column>
      <el-table-column label="操作" fixed="right" width="100" align="center"><template #default="{row}"><div class="table-btn-group"><el-button icon="View" type="primary" plain size="small" @click="openNode(row)">详情</el-button></div></template></el-table-column>
      <template #empty><el-empty v-if="!loading" :description="listError ? '加载失败，请刷新重试' : '暂无匹配节点，首次上报可能需要几秒'" :image-size="70"/></template>
    </ColumnTable>
    <p class="monitor-note">超过 20 秒未上报标记离线，超过 10 分钟从目录移除。离线节点显示最后一次快照，不代表当前资源占用。</p>
    <el-drawer v-model="detailVisible" :title="selected ? `${selected.name} · 节点详情` : '节点详情'" size="760px" class="monitor-drawer" :close-on-press-escape="true">
      <template v-if="selected">
        <div v-if="!selected.online || listError" class="mb-[12px]"><el-alert title="当前显示最后一次成功采集的数据" type="warning" :closable="false" show-icon/></div>
        <el-descriptions title="节点信息" :column="2" border>
          <el-descriptions-item label="主机名">{{ selected.hostname }}</el-descriptions-item>
          <el-descriptions-item label="进程">{{ selected.pid }}</el-descriptions-item>
          <el-descriptions-item label="系统">{{ selected.os }} / {{ selected.arch }}</el-descriptions-item>
          <el-descriptions-item label="应用版本">{{ selected.version }}</el-descriptions-item>
          <el-descriptions-item label="启动时间" :span="2">{{ date(selected.started_at) }}</el-descriptions-item>
          <el-descriptions-item label="实例 ID" :span="2"><span class="node-id">{{ selected.id }}</span></el-descriptions-item>
        </el-descriptions>
        <el-descriptions title="资源占用" :column="2" border>
          <el-descriptions-item label="机器 CPU">{{ percent(selected.cpu) }} / {{ selected.cpu_count }} 核</el-descriptions-item>
          <el-descriptions-item label="进程 CPU">{{ percent(selected.process_cpu) }}</el-descriptions-item>
          <el-descriptions-item label="机器内存" :span="2">{{ bytes(selected.memory_used) }} / {{ bytes(selected.memory_total) }}</el-descriptions-item>
          <el-descriptions-item label="运行目录所在卷" :span="2">{{ bytes(selected.disk_used) }} / {{ bytes(selected.disk_total) }}（{{ percent(selected.disk_percent) }}）</el-descriptions-item>
          <el-descriptions-item label="进程 RSS" :span="2">{{ bytes(selected.rss) }}</el-descriptions-item>
        </el-descriptions>
        <el-descriptions title="Go Runtime" :column="2" border>
          <el-descriptions-item label="Go 版本">{{ selected.go_version }}</el-descriptions-item>
          <el-descriptions-item label="GOMAXPROCS">{{ selected.gomaxprocs }}</el-descriptions-item>
          <el-descriptions-item label="Goroutine">{{ selected.goroutines }}</el-descriptions-item>
          <el-descriptions-item label="堆对象数">{{ selected.heap_objects.toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="堆内存">{{ bytes(selected.heap_bytes) }}</el-descriptions-item>
          <el-descriptions-item label="累计 GC">{{ selected.gc_cycles }}</el-descriptions-item>
          <el-descriptions-item label="本次间隔 GC">{{ selected.gc_delta ?? '采集中' }}</el-descriptions-item>
          <el-descriptions-item label="间隔 GC 暂停">{{ selected.gc_pause_seconds === null ? '采集中' : `${(selected.gc_pause_seconds * 1000).toFixed(2)} ms` }}</el-descriptions-item>
        </el-descriptions>
        <div class="trend"><div class="trend-heading"><strong>机器 CPU 短趋势</strong><span>本页面最近 60 次采样 · 0–100%</span></div>
          <svg v-if="trendPoints" viewBox="0 0 600 100" role="img" aria-label="当前节点机器 CPU 使用率趋势"><path d="M0 99H600 M0 50H600 M0 1H600" class="trend-grid"/><polyline :points="trendPoints" class="trend-line"/></svg>
          <el-empty v-else description="等待更多采样" :image-size="45"/>
        </div>
        <p v-for="notice in selected.notices" :key="notice" class="monitor-note">{{ notice }}</p>
      </template>
      <el-empty v-else description="节点已从目录移除" />
    </el-drawer>
  </el-card>
</template>

<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref} from 'vue';
import axios from 'axios';
import PageHeader from '../../components/PageHeader.vue';
import ColumnTable from '../../components/ColumnTable.vue';
import TableTime from '../../components/TableTime.vue';
import {SysMonitorApi,type MonitorNode} from '../../apis/sys_monitor.ts';
const rows=ref<MonitorNode[]>([]),loading=ref(false),listError=ref(''),autoRefresh=ref(true),updatedAt=ref('');
const searchInput=ref(''),search=ref(''),status=ref('online'),detailVisible=ref(false),selectedId=ref('');
const history=ref<Record<string,{time:string;cpu:number|null}[]>>({});
const online=computed(()=>rows.value.filter(row=>row.online));
const offlineCount=computed(()=>rows.value.length-online.value.length);
const totalRSS=computed(()=>online.value.some(row=>row.rss===null) ? null : online.value.reduce((sum,row)=>sum+(row.rss || 0),0));
const filtered=computed(()=>rows.value.filter(row=>(!search.value || `${row.name} ${row.hostname}`.toLowerCase().includes(search.value.toLowerCase())) && (!status.value || row.online===(status.value==='online'))));
const selected=computed(()=>rows.value.find(row=>row.id===selectedId.value));
const trendPoints=computed(()=>{const samples=(history.value[selectedId.value] || []);if(samples.length<2)return '';return samples.map((sample,index)=>sample.cpu===null ? '' : `${index/(samples.length-1)*600},${100-Math.min(100,Math.max(0,sample.cpu))}`).filter(Boolean).join(' ')});
let timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined,disposed=false;
function clearTimer(){if(timer)clearTimeout(timer);timer=undefined}
function schedule(){clearTimer();if(!disposed && autoRefresh.value && !document.hidden)timer=setTimeout(()=>void load(),5000)}
async function load(){
 if(disposed || loading.value)return;
 clearTimer();loading.value=true;controller=new AbortController();
 try{
  const response=await SysMonitorApi.List(controller.signal);if(disposed)return;
  rows.value=response.data.list;listError.value='';updatedAt.value=new Date().toLocaleTimeString();
  const next:typeof history.value={};
  for(const row of rows.value){const points=history.value[row.id] || [];next[row.id]=points;if(row.online && points[points.length-1]?.time!==row.sampled_at)next[row.id]=[...points,{time:row.sampled_at,cpu:row.cpu}].slice(-60)}
  history.value=next;
 }catch(error){if(!disposed && !axios.isCancel(error)){listError.value='节点数据加载失败，已暂停自动刷新；已有数据为上次快照，请手动重试';autoRefresh.value=false}}
 finally{loading.value=false;schedule()}
}
function updateRefresh(){if(autoRefresh.value)void load();else clearTimer()}
function visibilityChange(){if(document.hidden)clearTimer();else if(autoRefresh.value)void load()}
function resetSearch(){searchInput.value='';search.value='';status.value='online'}
function openNode(row:MonitorNode){selectedId.value=row.id;detailVisible.value=true}
function bytes(value:number|null){if(value===null)return '不可用';if(value===0)return '0 B';const units=['B','KB','MB','GB','TB'];const index=Math.min(4,Math.floor(Math.log(value)/Math.log(1024)));return `${(value/1024**index).toFixed(1)} ${units[index]}`}
function percent(value:number|null){return value===null ? '采集中或不可用' : `${value.toFixed(1)}%`}
function duration(seconds:number){const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60);return days ? `${days}天 ${hours}小时` : hours ? `${hours}小时 ${minutes}分钟` : `${minutes}分钟`}
function date(value:string){return new Date(value).toLocaleString()}
onMounted(()=>{document.addEventListener('visibilitychange',visibilityChange);void load()});
onUnmounted(()=>{disposed=true;clearTimer();controller?.abort();document.removeEventListener('visibilitychange',visibilityChange)});
</script>
<style scoped>
.monitor-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:20px}.monitor-summary>div{padding:16px;border:1px solid var(--el-border-color-lighter);border-radius:10px;background:var(--el-fill-color-light)}.monitor-summary span{display:block;font-size:13px;color:var(--el-text-color-secondary);margin-bottom:8px}.monitor-summary strong{font-size:24px;font-weight:600;color:var(--el-text-color-primary)}.monitor-summary .online{color:var(--el-color-success)}.monitor-summary .offline{color:var(--el-color-warning)}.node-name{font-weight:600}.muted,.monitor-note{font-size:12px;color:var(--el-text-color-secondary)}.monitor-note{line-height:1.8;margin:14px 0 0}.el-descriptions{margin-bottom:22px}.node-id{overflow-wrap:anywhere}.trend{border:1px solid var(--el-border-color-lighter);border-radius:10px;padding:14px;margin-bottom:16px}.trend-heading{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:16px}.trend-heading span{font-size:12px;color:var(--el-text-color-secondary)}.trend svg{display:block;width:100%;height:130px}.trend-line{fill:none;stroke:var(--el-color-primary);stroke-width:2;vector-effect:non-scaling-stroke}.trend-grid{fill:none;stroke:var(--el-border-color-lighter);stroke-width:1}@media(max-width:700px){.monitor-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.monitor-summary strong{font-size:20px}}
</style>
<style>.monitor-drawer{max-width:100vw!important}</style>

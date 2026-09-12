<template>
  <div class="workbench-page">
    <el-card shadow="never">
      <PageHeader title="工作台" description="常用功能一步直达，快速开始今天的管理工作" />
    </el-card>
    <el-card shadow="never">
      <div class="shortcut-heading"><h3>常用入口</h3><span>根据当前角色显示可访问页面</span></div>
      <nav class="shortcut-grid" aria-label="常用入口">
        <RouterLink v-for="item in shortcuts" :key="item.path" :to="item.path" class="shortcut-item">
          <span class="shortcut-icon"><iconify-icon v-if="item.icon.includes(':')" :icon="item.icon" /><el-icon v-else><component :is="item.icon" /></el-icon></span>
          <span class="shortcut-text"><strong>{{ item.name }}</strong><small>{{ item.group }}</small></span>
          <el-icon class="shortcut-arrow"><ArrowRight /></el-icon>
        </RouterLink>
      </nav>
    </el-card>
    <div class="workbench-help">
      <el-card shadow="never" class="help-panel" aria-labelledby="guide-title">
        <div class="shortcut-heading"><h3 id="guide-title">使用向导</h3><span>从常见操作开始</span></div>
        <ol class="guide-list">
          <li v-for="(item,index) in guides" :key="item.title">
            <span class="guide-number">{{ String(index+1).padStart(2,'0') }}</span>
            <div class="guide-content"><h4>{{ item.title }}</h4><p>{{ item.description }}</p>
              <RouterLink :to="item.entry.path" class="guide-link">{{ item.entry.name }}<el-icon><ArrowRight /></el-icon></RouterLink>
            </div>
          </li>
        </ol>
      </el-card>
      <el-card shadow="never" class="help-panel" aria-labelledby="features-title">
        <div class="shortcut-heading"><h3 id="features-title">框架功能</h3><span>了解各项功能的用途</span></div>
        <el-collapse v-model="openedFeature" accordion class="feature-list">
          <el-collapse-item v-for="item in features" :key="item.title" :name="item.title">
            <template #title><span class="feature-title"><span class="feature-icon"><iconify-icon v-if="item.entry.icon.includes(':')" :icon="item.entry.icon"/><el-icon v-else><component :is="item.entry.icon"/></el-icon></span>{{ item.title }}</span></template>
            <p>{{ item.description }}</p>
            <RouterLink :to="item.entry.path" class="guide-link">进入{{ item.entry.name }}<el-icon><ArrowRight /></el-icon></RouterLink>
          </el-collapse-item>
        </el-collapse>
        <div class="help-tip"><el-icon><InfoFilled /></el-icon><span>菜单随当前角色变化。需要其他功能时，请联系管理员分配菜单和接口权限。</span></div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed,ref} from 'vue';
import {RouterLink,useRoute,useRouter} from 'vue-router';
import {ArrowRight,InfoFilled} from '@element-plus/icons-vue';
import PageHeader from '../../components/PageHeader.vue';
import {useUserStore} from '../../stores/user.ts';
import {coreModules,viewModules} from '../../routes/componentModules.ts';

interface MenuItem {name:string;path:string;icon?:string;hidden?:boolean;component?:string;children?:MenuItem[]}
interface Shortcut {name:string;path:string;icon:string;group:string;component?:string}
const userStore=useUserStore(),route=useRoute(),router=useRouter();
const availableEntries=computed(()=>{
  const entries:Shortcut[]=[],seen=new Set<string>();
  const add=(item:Shortcut)=>{
    if(item.path===route.path || seen.has(item.path))return;
    seen.add(item.path);entries.push(item);
  };
  const visit=(menus:MenuItem[],parent='/dashboard',group='业务管理')=>{
    for(const item of menus){
      if(item.hidden)continue;
      const path=`${parent}/${item.path}`;
      if(item.component && (coreModules[item.component] || viewModules[item.component]) && router.resolve(path).matched.some(record=>record.path===path)){
        add({name:item.name,path,icon:item.icon?.trim() || 'Grid',group,component:item.component});
      }
      if(item.children)visit(item.children,path,item.name);
    }
  };
  visit(userStore.UserMenu);
  const personal:Shortcut[]=[
    {name:'个人信息',path:'/dashboard/sys_userinfo',icon:'iconoir:user-circle',group:'账号与安全',component:'../core/views/sys_userinfo/index.vue'},
    {name:'API 密钥',path:'/dashboard/sys_api_token',icon:'iconoir:key',group:'接口访问凭证',component:'../core/views/sys_api_token/index.vue'},
  ];
  // 合并个人入口，向导也复用完整的可访问页面列表。
  const personalPaths=new Set(personal.map(item=>item.path));
  return [...entries.filter(item=>!personalPaths.has(item.path)),...personal.map(item=>entries.find(entry=>entry.path===item.path) || item)];
});
// 常用入口最多六个管理页面，另保留两个个人入口。
const shortcuts=computed(()=>[...availableEntries.value.slice(0,-2).slice(0,6),...availableEntries.value.slice(-2)]);
interface HelpDefinition {component:string;title:string;description:string}
const resolveHelp=(definitions:HelpDefinition[])=>definitions.flatMap(item=>{
  const entry=availableEntries.value.find(entry=>entry.component===`../core/views/${item.component}`);
  return entry ? [{...item,entry}] : [];
});
const guides=computed(()=>resolveHelp([
  {component:'sys_userinfo/index.vue',title:'完善个人资料',description:'核对联系方式并设置自己的登录密码，后续可在右上角切换已绑定的角色。'},
  {component:'sys_role/index.vue',title:'按职责配置权限',description:'为角色选择需要的菜单和接口，再到管理员页面为账号绑定角色。'},
  {component:'sys_config/values.vue',title:'设置后台基础信息',description:'按分组调整站点名称、标题和登录策略，保存后由系统统一读取。'},
  {component:'sys_api_token/index.vue',title:'按需创建 API 密钥',description:'需要程序调用接口时，选择授权角色、有效期和备注；创建后及时保存完整密钥。'},
  {component:'sys_devtools/autocode.vue',title:'开始开发业务模块',description:'在开发工具中定义字段、筛选和操作权限，先预览生成内容，再确认文件变更；生成后配置角色的菜单与接口权限。'},
]));
const openedFeature=ref('账号与角色');
const features=computed(()=>resolveHelp([
  {component:'sys_userinfo/index.vue',title:'账号与角色',description:'维护个人资料和密码。一个账号可以绑定多个角色，切换角色后使用对应的菜单和接口权限；修改密码后其他旧登录会失效。'},
  {component:'sys_api_token/index.vue',title:'API 密钥',description:'为程序调用创建独立凭证，可指定自己拥有的角色，设置到期时间或永久有效。删除不再使用的密钥后，后续请求将无法通过认证。'},
  {component:'sys_role/index.vue',title:'权限管理',description:'菜单决定可见页面，接口权限决定允许执行的操作。角色支持拷贝，适合快速建立职责相近的权限组合。'},
  {component:'sys_config/values.vue',title:'配置管理',description:'按分组管理站点和业务配置，支持恢复默认值、同步缓存和清理无效配置。保存的数据由数据库持久化。'},
  {component:'sys_monitor/index.vue',title:'节点监控',description:'集中查看节点资源、进程内存和 Go 运行状态。支持单实例和多实例，每 5 秒采集；离线节点展示最后一次上报的数据。'},
  {component:'sys_cron_job/index.vue',title:'计划任务',description:'选择已注册的任务处理函数，设置执行规则与参数，通过执行日志了解成功、失败和错误原因。'},
  {component:'sys_login_log/index.vue',title:'登录日志',description:'查看登录时间、来源和结果，定位异常登录；可按需要清理历史记录。'},
  {component:'sys_devtools/autocode.vue',title:'开发工具',description:'在开发环境生成业务页面与接口代码，预览文件变更并查看生成历史，减少重复搭建工作。'},
]));
</script>

<style scoped lang="less">
.workbench-page{display:grid;gap:16px}
.shortcut-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:4px 0 14px;
  h3{margin:0;font-size:15px;font-weight:600;color:var(--el-text-color-primary)}
  >span{font-size:12px;color:var(--el-text-color-secondary)}
}
.shortcut-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.shortcut-item{display:flex;align-items:center;gap:12px;padding:17px 16px;text-decoration:none;border:1px solid var(--el-border-color-lighter);border-radius:10px;background:var(--el-bg-color);color:var(--el-text-color-primary);transition:border-color .18s,background-color .18s;
  &:hover,&:focus-visible{border-color:var(--el-color-primary-light-5);background:var(--el-color-primary-light-9)}
  &:focus-visible{outline:2px solid var(--el-color-primary);outline-offset:2px}
}
.shortcut-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:40px;height:40px;border-radius:10px;background:var(--el-fill-color-light);color:var(--el-color-primary);font-size:21px;line-height:1}
.shortcut-text{min-width:0;flex:1;strong,small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}strong{font-size:14px;font-weight:500}small{margin-top:5px;font-size:12px;color:var(--el-text-color-secondary)}}
.shortcut-arrow{font-size:13px;color:var(--el-text-color-placeholder)}
.workbench-help{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.help-panel{min-width:0}.guide-list{list-style:none;margin:0;padding:0;li{display:flex;align-items:flex-start;gap:14px;padding:14px 0; +li{border-top:1px solid var(--el-border-color-extra-light)}}}
.guide-number{flex-shrink:0;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;font-size:12px;font-weight:600;color:var(--el-color-primary);background:var(--el-color-primary-light-9)}
.guide-content{min-width:0;h4{margin:2px 0 6px;font-size:14px;font-weight:500;color:var(--el-text-color-primary)}p{margin:0 0 9px;font-size:13px;line-height:1.8;color:var(--el-text-color-secondary)}}
.guide-link{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--el-color-primary);text-decoration:none;&:hover{text-decoration:underline}&:focus-visible{outline:2px solid var(--el-color-primary);outline-offset:3px}}
.feature-list{border-top:0;p{margin:0 0 9px;color:var(--el-text-color-secondary);line-height:1.8;font-size:13px}}.feature-title{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500}.feature-icon{display:flex;align-items:center;font-size:18px;color:var(--el-color-primary)}
.help-tip{display:flex;align-items:flex-start;gap:8px;margin-top:16px;padding:12px;border-radius:8px;background:var(--el-fill-color-light);color:var(--el-text-color-secondary);font-size:12px;line-height:1.8;>.el-icon{flex-shrink:0;margin-top:4px}}
@media(max-width:800px){.workbench-help{grid-template-columns:1fr}}
@media(max-width:1100px){.shortcut-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:520px){.shortcut-grid{grid-template-columns:1fr}.shortcut-item{padding:13px 14px}}
</style>

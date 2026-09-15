<template>
  <template v-for="menu in props.menus" :key="BuildMenuPath(menu)">
    <el-menu-item v-if="!menu.hidden && !menu.children?.length" :index="BuildMenuPath(menu)">
      <el-icon>
        <iconify-icon :icon="menu.icon || 'iconoir:view-grid'"></iconify-icon>
      </el-icon>
      <template #title><span>{{ menu.name }}</span></template>
    </el-menu-item>
    <el-sub-menu v-else-if="!menu.hidden" :index="BuildMenuPath(menu)" popper-class="sidebar-menu-popper">
      <template #title>
        <el-icon>
          <iconify-icon :icon="menu.icon || 'iconoir:view-grid'"></iconify-icon>
        </el-icon>
        <span>{{ menu.name }}</span>
      </template>
      <MenuItem :menus="menu.children" :prefix="BuildMenuPath(menu)"></MenuItem>
    </el-sub-menu>
  </template>
</template>

<script lang="ts" setup>
const props: any = defineProps({
  menus: {
    type: Array,
    default: () => {
      return []
    }
  },
  prefix: {
    type: String,
    default: () => {
      return "/dashboard"
    }
  }
})
const BuildMenuPath = (menu: any) => {
  return props.prefix + "/" + menu.path
}
</script>

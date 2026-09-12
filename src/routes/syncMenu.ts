import router from "./index.ts";
import {watch} from "vue";
import {coreModules, layoutsModules, viewModules} from "./componentModules.ts";
export {layoutsModules, viewModules, SyncComponents} from "./componentModules.ts";

let currentMenus:Array<any> | undefined
let currentDefaultMenu = 'sys_home'

export const getBaseRouter = ()=>{
    return {
        path: '/dashboard',
        name:'dashboard',
        component:layoutsModules["../layouts/dashboard.vue"],
        meta:{
            name:"根目录",
        },
        redirect:'/dashboard/sys_home',
        children:[{
            path:'sys_userinfo',
            name:'account-profile',
            component:coreModules['../core/views/sys_userinfo/index.vue'],
            meta:{name:'个人信息',icon:'iconoir:user-circle'},
        },{
            path:'sys_api_token',
            name:'account-api-token',
            component:coreModules['../core/views/sys_api_token/index.vue'],
            meta:{name:'API 密钥',icon:'iconoir:key'},
        }]
    }
}

const flatMenuTreeToRouter = (menus:Array<any>,routers:Array<any>,parent = '/dashboard')=>{
    if (!routers){
        routers = []
    }
    menus.forEach((item)=>{
        let route:any = {
            name:`admin-menu:${parent}/${item.path}`,
            path:item.path,
            meta:{
                name:item.name,
                icon:item.icon,
            },
        }
        if (viewModules[item.component] || coreModules[item.component]){
            route.component = viewModules[item.component] || coreModules[item.component]
        }
        if (item.children){
            route.children = flatMenuTreeToRouter(item.children,[],`${parent}/${item.path}`)
        }
        routers.push(route)
    })
    return routers
}

// 无组件目录下的子路由需要单独移除，不能只替换 dashboard 父路由。
const clearSyncRoutes = ()=>{
    for (const route of router.getRoutes()) {
        if (typeof route.name === 'string' && route.name.startsWith('admin-menu:')) router.removeRoute(route.name)
    }
}

export const resetSyncRouter = ()=>{
    clearSyncRoutes()
    currentMenus = undefined
    router.addRoute(getBaseRouter())
}

export const addSyncRouter = (menus:Array<any>, defaultMenu = 'sys_home')=>{
    clearSyncRoutes()
    currentMenus = menus
    currentDefaultMenu = defaultMenu
    let routes:any = flatMenuTreeToRouter(menus,[])
    const dashboardRouter:any = getBaseRouter()
    dashboardRouter.children.push(...routes)
    const homePath = (items:Array<any>, parent='/dashboard'):string | undefined => {
        for (const item of items) {
            const path = `${parent}/${item.path}`
            if (item.key === defaultMenu && item.component && !item.hidden) return path
            const child = homePath(item.children || [], path)
            if (child) return child
        }
    }
    dashboardRouter.redirect = homePath(menus) || '/dashboard/sys_userinfo' 
    router.addRoute(dashboardRouter)
}

if (import.meta.hot){
    const stop = watch(
        ()=>[Object.keys(coreModules),Object.keys(layoutsModules),Object.keys(viewModules)],
        ()=>{
            if (currentMenus) addSyncRouter(currentMenus,currentDefaultMenu)
        }
    )
    import.meta.hot.dispose(stop)
}

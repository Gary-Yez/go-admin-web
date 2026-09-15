import {defineStore} from "pinia";
import {SysConfigApi, type SiteInfo} from "../apis/sys_config";

export const useSiteStore = defineStore('sys_site', {
    state: () => ({
        info: {
            name: 'Go Admin', logo: '/logo.png', favicon: '/logo.png',
            title: 'Go Admin 管理后台', copyright: '',
        } as SiteInfo,
    }),
    actions: {
        async load() {
            try {
                const response = await SysConfigApi.Site()
                this.info = response.data
            } catch { /* 请求失败时保留现有展示，请求层统一提示。 */ }
        },
    },
})

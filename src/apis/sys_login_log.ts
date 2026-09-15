import {request} from "../utils/request";

export interface LoginLog {
    id: number
    created_at: string
    user_id: number
    username: string
    ip: string
    status: 'success' | 'failed' | 'blocked'
    message: string
    user_agent: string
    duration: number
}

export interface LoginLogQuery {
    sorts?: { field: string; order: string }[]
    page: number
    limit: number
    filters: { field: string; operator: string; value: string | string[] }[]
}

export const SysLoginLogApi = {
    List(query: LoginLogQuery) {
        return request.post<unknown, { data: { list: LoginLog[]; total: number } }>('/sys_login_log/list', query)
    },
    Delete(ids: number[]) {
        return request.post('/sys_login_log/delete', {ids})
    },
    Cleanup(days: number) {
        return request.post<unknown, { data: { count: number } }>('/sys_login_log/cleanup', {days})
    },
}

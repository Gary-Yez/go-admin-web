import {request} from "../utils/request";

export const SysApiTokenApi = {
    List(query: { page: number, limit: number, filters: object[] }) {
        const params = new URLSearchParams({page: String(query.page), limit: String(query.limit)});
        query.filters.forEach(filter => params.append("filters", JSON.stringify(filter)));
        return request.get("/sys_api_token/mine/list", {params});
    },
    Save(form: object) {
        return request.post("/sys_api_token/mine/save", form);
    },
    Delete(id: number) {
        return request.post("/sys_api_token/mine/delete", {id});
    },
}
export interface ManagedToken {
    id: number
    admin_id: number
    username: string
    nickname: string
    role_id: number
    role_name: string
    prefix: string
    remark: string
    created_at: string
    expires_at: string | null
    status: 'active' | 'permanent' | 'expired' | 'invalid'
}

export interface TokenQuery {
    sorts?: { field: string; order: string }[]
    page: number
    limit: number
    filters: { field: string; operator: string; value: string | number | string[] }[]
}

export const SysApiTokenManageApi = {
    List(query: TokenQuery) {
        return request.post<unknown, {
            data: { list: ManagedToken[]; total: number; role_options: { id: number; name: string }[] }
        }>('/sys_api_token/list', query)
    },
    Delete(ids: number[]) {
        return request.post('/sys_api_token/delete', {ids})
    },
}

import {request} from "../utils/request";

export type CronParamType = 'string' | 'int' | 'bool' | 'array'

export interface CronParam {
    name: string
    key: string
    type: CronParamType
    description: string
    required: boolean
    item_type?: Exclude<CronParamType, 'array'>
}

export interface CronParamOption {
    label: string
    value: string | number | boolean
}

export interface CronHandler {
    name: string
    params: CronParam[] | null
}

type Result<T> = {data: T}

export const SysCronJobApi = {
    GetRegisteredHandler() {
        return request.get<unknown, Result<Record<string, CronHandler>>>("/sys_cron_job/get_handlers");
    },
    GetParamOptions(handlerKey: string, paramKey: string, signal?: AbortSignal) {
        return request.get<unknown, Result<CronParamOption[]>>("/sys_cron_job/get_param_options", {
            params: {handler_key: handlerKey, param_key: paramKey},
            signal,
        });
    },
    List(query: any) {
        return request.post("/sys_cron_job/list", query);
    },
    GetLogs(query: any) {
        return request.post("/sys_cron_job/logs", query);
    },
    Create(form: any) {
        return request.post("/sys_cron_job/create", {
            ...form,
            params: form.params ? JSON.stringify(form.params) : ""
        });
    },
    Edit(form: any) {
        return request.post("/sys_cron_job/edit", {
            ...form,
            params: form.params ? JSON.stringify(form.params) : ""
        });
    },
    Delete(ids: Array<number>) {
        return request.post("/sys_cron_job/delete", {
            ids: ids
        });
    }
}

import {request} from "../utils/request";

export const SysCronJobApi = {
    GetRegisteredHandler() {
        return request.get("/sys_cron_job/get_handlers");
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
        console.log(form.params)
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

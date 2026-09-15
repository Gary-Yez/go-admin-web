import {request} from "../utils/request";

export const SysMenuApi = {
    List() {
        return request.get("/sys_menu/list");
    },
    Sort(form: {
        id: number;
        target_id: number;
        position: 'before' | 'after' | 'inside';
        source_parent_id: number | null;
        target_parent_id: number | null;
        source_ids: number[];
        target_ids: number[]
    }) {
        return request.post("/sys_menu/sort", form);
    },
    Create(form: Object) {
        return request.post("/sys_menu/create", form);
    },
    Edit(form: Object) {
        return request.post("/sys_menu/edit", form);
    },
    Delete(ids: Array<number>) {
        return request.post("/sys_menu/delete", {
            ids: ids
        });
    }
}

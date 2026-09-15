import {request} from "../utils/request";

export interface MonitorNode {
    id: string;
    name: string;
    hostname: string;
    pid: number;
    os: string;
    arch: string;
    version: string;
    started_at: string;
    sampled_at: string;
    last_seen: string;
    online: boolean;
    uptime: number;
    cpu_count: number;
    cpu: number | null;
    memory_total: number | null;
    memory_used: number | null;
    memory_percent: number | null;
    disk_total: number | null;
    disk_used: number | null;
    disk_percent: number | null;
    process_cpu: number | null;
    rss: number | null;
    go_version: string;
    goroutines: number;
    heap_bytes: number;
    heap_objects: number;
    gc_cycles: number;
    gc_delta: number | null;
    gc_pause_seconds: number | null;
    gomaxprocs: number;
    notices: string[];
}

export const SysMonitorApi = {
    List(signal?: AbortSignal) {
        return request.get<unknown, { data: { list: MonitorNode[] } }>("/sys_monitor/list", {signal})
    },
}

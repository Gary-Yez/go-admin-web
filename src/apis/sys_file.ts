import type {AxiosProgressEvent} from "axios";
import {request} from "../utils/request";
import type {StorageOption} from "./sys_storage";

export interface ManagedFile {
    id: number
    name: string
    size: number
    content_type: string
    storage_id: number
    storage_name: string
    engine: string
    status: 'uploading' | 'ready'
    user_id: number
    username: string
    is_owner: boolean
    multipart: boolean
    last_modified: number
    created_at: string
    updated_at: string
    expires_at: string | null
}
export interface FileQuery {
    page: number
    limit: number
    filters: {field: string; operator: string; value: string}[]
    sorts: {field: string; order: string}[]
}
export interface UploadPolicy {
    allowed_extensions: string[]
    ordinary_limit: number
    part_size: number
    max_size: number
    session_days: number
}
export interface UploadSession {
    file: ManagedFile
    parts: {number: number; size: number}[]
    part_size: number
}
type Result<T> = {data: T}
type Progress = (event: AxiosProgressEvent) => void

export const SysFileApi = {
    Options(signal?: AbortSignal) {
        return request.get<unknown, Result<{policy: UploadPolicy; storages: StorageOption[]}>>('/sys_file/options', {signal})
    },
    List(query: FileQuery) {
        return request.post<unknown, Result<{list: ManagedFile[]; total: number; policy: UploadPolicy; storages: StorageOption[]}>>('/sys_file/list', query)
    },
    Upload(file: File, storageId: number, signal: AbortSignal, onUploadProgress: Progress) {
        const body = new FormData()
        body.append('file', file)
        body.append('storage_id', String(storageId))
        return request.post<unknown, Result<ManagedFile>>('/sys_file/upload', body, {signal, onUploadProgress, timeout: 0})
    },
    Begin(file: File, storageId: number, signal: AbortSignal) {
        return request.post<unknown, Result<UploadSession>>('/sys_file/begin', {
            name: file.name, size: file.size, last_modified: file.lastModified, storage_id: storageId,
        }, {signal, timeout: 0})
    },
    Session(id: number, signal?: AbortSignal) {
        return request.get<unknown, Result<UploadSession>>('/sys_file/session', {params: {id}, signal})
    },
    Part(id: number, number: number, blob: Blob, signal: AbortSignal, onUploadProgress: Progress) {
        return request.post('/sys_file/part', blob, {
            params: {id, number}, headers: {'Content-Type': 'application/octet-stream'},
            signal, onUploadProgress, timeout: 0,
        })
    },
    Complete(id: number, signal: AbortSignal) {
        return request.post<unknown, Result<ManagedFile>>('/sys_file/complete', {id}, {signal, timeout: 0})
    },
    Abort(id: number) {
        return request.post('/sys_file/abort', {id}, {timeout: 0})
    },
    Delete(ids: number[], recordsOnly = false) {
        return request.post('/sys_file/delete', {ids, records_only: recordsOnly}, {timeout: 0})
    },
    Cleanup() {
        return request.post<unknown, Result<{count: number}>>('/sys_file/cleanup', {}, {timeout: 0})
    },
    async Link(id: number, preview = false, signal?: AbortSignal) {
        const response = await request.post<unknown, Result<{url: string}>>('/sys_file/link', {id, preview}, {signal})
        const url = response.data.url
        return /^https?:\/\//i.test(url) ? url : request.getUri({url})
    },
}

export function formatFileSize(size: number): string {
    if (size < 1024) return size + ' B'
    const units = ['KiB', 'MiB', 'GiB']
    let value = size / 1024
    let index = 0
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index++ }
    return value.toFixed(1) + ' ' + units[index]
}

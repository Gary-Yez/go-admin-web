import type {ManagedFile} from '../../apis/sys_file'

export type FilePreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text'

// 与后端可预览 MIME 保持一致；扩展名只用于显示图标，不决定内容是否可信。
export function filePreviewKind(row: ManagedFile): FilePreviewKind | undefined {
    const mime = row.content_type.toLowerCase()
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'].includes(mime)) return 'image'
    if (['video/mp4', 'video/webm', 'video/ogg'].includes(mime)) return 'video'
    if (['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/flac', 'audio/webm', 'application/ogg'].includes(mime)) return 'audio'
    if (mime === 'application/pdf') return 'pdf'
    if (mime.startsWith('text/') || ['application/json', 'application/xml', 'application/javascript', 'application/x-ndjson'].includes(mime)) return 'text'
}

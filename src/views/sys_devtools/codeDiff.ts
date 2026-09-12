export interface Edit { kind: 'same' | 'remove' | 'add'; text: string }
export interface DiffRow { kind: 'same' | 'change'; left?: string; right?: string; leftNo?: number; rightNo?: number }

// Bound memory usage for unusually large files; common prefix/suffix remain aligned.
export function sequenceDiff(left: string[], right: string[]): Edit[] {
  let start = 0
  while (start < left.length && start < right.length && left[start] === right[start]) start++
  let endLeft = left.length, endRight = right.length
  while (endLeft > start && endRight > start && left[endLeft - 1] === right[endRight - 1]) { endLeft--; endRight-- }
  const result: Edit[] = left.slice(0, start).map(text => ({ kind: 'same', text }))
  const a = left.slice(start, endLeft), b = right.slice(start, endRight)
  if ((a.length + 1) * (b.length + 1) > 2_000_000) {
    for (const text of a) result.push({ kind: 'remove', text })
    for (const text of b) result.push({ kind: 'add', text })
  } else {
    const width = b.length + 1
    const lengths = new Uint32Array((a.length + 1) * width)
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        lengths[i * width + j] = a[i] === b[j] ? lengths[(i + 1) * width + j + 1]! + 1
          : Math.max(lengths[(i + 1) * width + j]!, lengths[i * width + j + 1]!)
      }
    }
    let i = 0, j = 0
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) { result.push({ kind: 'same', text: a[i++]! }); j++ }
      else if (i < a.length && (j === b.length || lengths[(i + 1) * width + j]! >= lengths[i * width + j + 1]!)) {
        result.push({ kind: 'remove', text: a[i++]! })
      } else { result.push({ kind: 'add', text: b[j++]! }) }
    }
  }
  for (const text of left.slice(endLeft)) result.push({ kind: 'same', text })
  return result
}

export function splitLines(code: string): string[] {
  return code.replace(/\r\n/g, '\n').match(/[^\n]*\n|[^\n]+$/g) ?? []
}

export function buildRows(before: string, after: string): DiffRow[] {
  const edits = sequenceDiff(splitLines(before), splitLines(after))
  const rows: DiffRow[] = []
  let leftNo = 1, rightNo = 1
  for (let i = 0; i < edits.length;) {
    const edit = edits[i]!
    if (edit.kind === 'same') {
      rows.push({ kind: 'same', left: edit.text, right: edit.text, leftNo: leftNo++, rightNo: rightNo++ }); i++
      continue
    }
    const removed: string[] = [], added: string[] = []
    while (i < edits.length && edits[i]!.kind !== 'same') {
      const current = edits[i++]!
      ;(current.kind === 'remove' ? removed : added).push(current.text)
    }
    for (let j = 0; j < Math.max(removed.length, added.length); j++) {
      rows.push({ kind: 'change', left: removed[j], right: added[j],
        leftNo: j < removed.length ? leftNo++ : undefined, rightNo: j < added.length ? rightNo++ : undefined })
    }
  }
  return rows
}

export function changedRanges(before: string, after: string): { left: [number, number][]; right: [number, number][] } {
  const ranges = { left: [] as [number, number][], right: [] as [number, number][] }
  const append = (target: [number, number][], start: number, end: number) => {
    const last = target[target.length - 1]
    if (last && last[1] === start) last[1] = end
    else target.push([start, end])
  }
  let left = 0, right = 0
  for (const edit of sequenceDiff(Array.from(before.replace(/\n$/, '')), Array.from(after.replace(/\n$/, '')))) {
    if (edit.kind === 'same') { left += edit.text.length; right += edit.text.length }
    else if (edit.kind === 'remove') { append(ranges.left, left, left + edit.text.length); left += edit.text.length }
    else { append(ranges.right, right, right + edit.text.length); right += edit.text.length }
  }
  return ranges
}

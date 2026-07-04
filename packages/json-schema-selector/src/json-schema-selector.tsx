import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@cisri/core';
import type { JsonSchema } from '@cisri/json-schema-core';
import { generateSampleData } from '@cisri/json-schema-core';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { Search } from 'lucide-react';

export interface JsonSchemaEntry {
  id: string;
  name: string;
  description?: string;
  schema: JsonSchema;
}

export interface JsonSchemaSelectorClassNames {
  root?: string;
  trigger?: string;
  dialogContent?: string;
  searchInput?: string;
  list?: string;
  listItem?: string;
  previewPanel?: string;
  schemaPreview?: string;
  samplePreview?: string;
  footer?: string;
}

export interface JsonSchemaSelectorProps {
  entries: JsonSchemaEntry[];
  selectedId?: string;
  onSelect: (entry: JsonSchemaEntry) => void;
  onSearch?: (keyword: string) => void;
  searchDebounceMs?: number;
  loading?: boolean;
  trigger?: React.ReactNode;
  title?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
  classNames?: JsonSchemaSelectorClassNames;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

function JsonPreview({
  label,
  value,
  className,
}: {
  label: string;
  value: unknown;
  className?: string;
}) {
  const text = useMemo(() => JSON.stringify(value, null, 2), [value]);
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <h4 className="text-xs font-medium text-muted-foreground">{label}</h4>
      <pre className="rounded-md border border-border bg-muted/50 p-3 font-mono text-xs overflow-auto max-h-[240px]">
        {text}
      </pre>
    </div>
  );
}

export function JsonSchemaSelector({
  entries,
  selectedId,
  onSelect,
  onSearch,
  searchDebounceMs = 300,
  loading = false,
  trigger,
  title = '选择 Schema',
  emptyText = '暂无可用 schema',
  searchPlaceholder = '搜索 schema...',
  className,
  classNames,
}: JsonSchemaSelectorProps) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, searchDebounceMs);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(selectedId ?? null);

  const effectiveId = pendingId ?? hoveredId;

  useEffect(() => {
    if (!open) return;
    onSearch?.(debouncedKeyword);
  }, [debouncedKeyword, onSearch, open]);

  useEffect(() => {
    if (open) {
      setPendingId(selectedId ?? null);
      setHoveredId(null);
      setKeyword('');
    }
  }, [open, selectedId]);

  const filteredEntries = useMemo(() => {
    if (onSearch) return entries;
    const lower = keyword.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(lower) ||
        (entry.description?.toLowerCase().includes(lower) ?? false)
    );
  }, [entries, keyword, onSearch]);

  useEffect(() => {
    if (effectiveId && !filteredEntries.some((entry) => entry.id === effectiveId)) {
      setPendingId(null);
      setHoveredId(null);
    }
  }, [effectiveId, filteredEntries]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === effectiveId) ?? null,
    [entries, effectiveId]
  );

  const sampleData = useMemo(
    () => (selectedEntry ? generateSampleData(selectedEntry.schema) : null),
    [selectedEntry]
  );

  const handleConfirm = useCallback(() => {
    const entry = entries.find((entry) => entry.id === pendingId);
    if (entry) {
      onSelect(entry);
      setOpen(false);
    }
  }, [entries, onSelect, pendingId]);

  return (
    <div className={cn(className)}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" className={classNames?.trigger}>
              选择 Schema
            </Button>
          )}
        </DialogTrigger>
        <DialogContent
          className={cn(
            'flex max-h-[80vh] flex-col overflow-hidden p-0',
            classNames?.dialogContent
          )}
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              在左侧选择 schema，右侧可查看结构和示例数据。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            <div className={cn('flex w-1/3 flex-col border-r border-border p-4', classNames?.list)}>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={searchPlaceholder}
                  className={cn('pl-9', classNames?.searchInput)}
                  aria-label="搜索 schema"
                />
              </div>

              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyText}</p>
              ) : (
                <ScrollArea className="flex-1">
                  <div role="listbox" aria-label="schema 列表" className="space-y-1 pr-3">
                    {filteredEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        role="option"
                        aria-selected={pendingId === entry.id}
                        onClick={() => setPendingId(entry.id)}
                        onMouseEnter={() => setHoveredId(entry.id)}
                        onMouseLeave={() => setHoveredId((prev) => (prev === entry.id ? null : prev))}
                        className={cn(
                          'w-full rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                          pendingId === entry.id && 'border-border bg-muted',
                          classNames?.listItem
                        )}
                      >
                        <div className="font-medium">{entry.name}</div>
                        {entry.description && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {entry.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <div className={cn('flex w-2/3 flex-col gap-4 overflow-auto p-4', classNames?.previewPanel)}>
              {selectedEntry ? (
                <>
                  <JsonPreview
                    label="Schema"
                    value={selectedEntry.schema}
                    className={classNames?.schemaPreview}
                  />
                  <JsonPreview
                    label="示例数据"
                    value={sampleData}
                    className={classNames?.samplePreview}
                  />
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-sm text-muted-foreground">
                  请从左侧选择一个 schema 以预览
                </div>
              )}
            </div>
          </div>

          <Separator />

          <DialogFooter className={cn('px-6 pb-6 pt-2', classNames?.footer)}>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!pendingId}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

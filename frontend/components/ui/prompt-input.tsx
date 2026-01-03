/**
 * Copyright 2023 Vercel, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Loader2Icon, SendIcon, SquareIcon, XIcon } from 'lucide-react';
import type {
  ComponentProps,
  HTMLAttributes,
  KeyboardEventHandler,
} from 'react';

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

export type PromptInputProps = HTMLAttributes<HTMLFormElement>;
export const PromptInput = ({ className, ...props }: PromptInputProps) => (
  <form
    className={cn(
      'w-full overflow-hidden rounded-lg border border-sidebar-border bg-sidebar/50',
      className
    )}
    {...(props as any)}
  />
);

export type PromptInputTextareaProps = ComponentProps<typeof Textarea> & {
  minHeight?: number;
  maxHeight?: number;
};
export const PromptInputTextarea = ({
  onChange,
  className,
  placeholder = 'What would you like to know?',
  minHeight = 48,
  maxHeight = 164,
  ...props
}: PromptInputTextareaProps) => {
  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow newline
        return;
      }
      // Submit on Enter (without Shift)
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };
  return (
    <Textarea
      className={cn(
        'w-full resize-none rounded-none border-none px-3 py-3 shadow-none outline-none',
        'min-h-[48px] bg-transparent dark:bg-transparent',
        'focus-visible:ring-0 focus-visible:border-0',
        'placeholder:text-muted-foreground/70 text-sm',
        className
      )}
      name="message"
      onChange={(e) => {
        onChange?.(e);
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...(props as any)}
    />
  );
};

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputToolbar = ({
  className,
  ...props
}: PromptInputToolbarProps) => (
  <div
    className={cn('flex items-center justify-between px-2 py-2', className)}
    {...(props as any)}
  />
);

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTools = ({
  className,
  ...props
}: PromptInputToolsProps) => (
  <div
    className={cn(
      'flex items-center gap-1',
      className
    )}
    {...(props as any)}
  />
);

export type PromptInputButtonProps = ComponentProps<typeof Button>;
export const PromptInputButton = ({
  variant = 'ghost',
  className,
  size = 'icon-sm',
  ...props
}: PromptInputButtonProps) => {
  return (
    <Button
      className={cn(
        'shrink-0 rounded-md text-muted-foreground hover:text-foreground',
        className
      )}
      size={size}
      type="button"
      variant={variant}
      {...(props as any)}
    />
  );
};

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: ChatStatus;
};
export const PromptInputSubmit = ({
  className,
  variant = 'default',
  size = 'icon-sm',
  status,
  children,
  ...props
}: PromptInputSubmitProps) => {
  let Icon = <SendIcon className="size-4" />;
  if (status === 'submitted') {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === 'streaming') {
    Icon = <SquareIcon className="size-4" />;
  } else if (status === 'error') {
    Icon = <XIcon className="size-4" />;
  }
  return (
    <Button
      className={cn('rounded-md', className)}
      size={size}
      type="submit"
      variant={variant}
      {...(props as any)}
    >
      {children ?? Icon}
    </Button>
  );
};

export type PromptInputModelSelectProps = ComponentProps<typeof Select>;
export const PromptInputModelSelect = (props: PromptInputModelSelectProps) => (
  <Select {...(props as any)} />
);

export type PromptInputModelSelectTriggerProps = ComponentProps<
  typeof SelectTrigger
>;
export const PromptInputModelSelectTrigger = ({
  className,
  ...props
}: PromptInputModelSelectTriggerProps) => (
  <SelectTrigger
    size="sm"
    className={cn(
      'border-none bg-transparent text-xs font-medium text-muted-foreground shadow-none transition-colors w-auto gap-1',
      'hover:bg-accent hover:text-foreground [&[aria-expanded="true"]]:bg-accent [&[aria-expanded="true"]]:text-foreground',
      className
    )}
    {...(props as any)}
  />
);

export type PromptInputModelSelectContentProps = ComponentProps<
  typeof SelectContent
>;
export const PromptInputModelSelectContent = ({
  className,
  ...props
}: PromptInputModelSelectContentProps) => (
  <SelectContent className={cn(className)} {...(props as any)} />
);

export type PromptInputModelSelectItemProps = ComponentProps<typeof SelectItem>;
export const PromptInputModelSelectItem = ({
  className,
  ...props
}: PromptInputModelSelectItemProps) => (
  <SelectItem className={cn(className)} {...(props as any)} />
);

export type PromptInputModelSelectValueProps = ComponentProps<
  typeof SelectValue
>;
export const PromptInputModelSelectValue = ({
  className,
  ...props
}: PromptInputModelSelectValueProps) => (
  <SelectValue className={cn(className)} {...(props as any)} />
);


"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X, LoaderCircle, ArrowRight, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  dismissible = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal"
          onEscapeKeyDown={(e) => {
            if (!dismissible) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!dismissible) e.preventDefault();
          }}
        >
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            {dismissible && (
              <Dialog.Close className="icon-button" aria-label="Close dialog">
                <X size={20} />
              </Dialog.Close>
            )}
          </div>
          <Dialog.Description className="sr-only">
            Details and controls for {title.toLowerCase()}.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} /> Opening the library…
    </div>
  );
}
export function BookGridLoading({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading books">
      <span className="sr-only">Loading books…</span>
      <div className={"book-grid " + (count === 5 ? "five" : "")}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="book-skeleton" aria-hidden="true">
            <div className="skeleton-cover" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        ))}
      </div>
    </div>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <BookOpen size={32} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Arrow() {
  return <ArrowRight size={17} />;
}

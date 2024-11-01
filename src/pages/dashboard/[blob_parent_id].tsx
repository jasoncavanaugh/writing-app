import { ChevronRightIcon, Edit, Edit2, SendHorizonalIcon } from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useSession } from "next-auth/react";
import {
  ElementRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Layout from "~/components/Layout";
import { Spinner } from "~/components/Spinner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { SIGN_IN_ROUTE } from "~/lib/types";
import { getServerAuthSession } from "~/server/auth";
import { BlobType } from "~/server/db/schema";
import { api } from "~/utils/api";
import { GetServerSideProps } from "next/types";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

export const RADIX_MODAL_CONTENT_CLASSES = cn(
  "z-50 shadow-lg duration-500",
  "data-[state=open]:animate-in",
  "data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0",
  "data-[state=open]:fade-in-0",
  "data-[state=closed]:zoom-out-95",
  "data-[state=open]:zoom-in-95",
  "data-[state=closed]:slide-out-to-left-1/2",
  "data-[state=closed]:slide-out-to-top-[48%]",
  "data-[state=open]:slide-in-from-left-1/2",
  "data-[state=open]:slide-in-from-top-[48%]",
);
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerAuthSession(ctx);
  return {
    props: { session },
  };
};
export default function Dashboard() {
  const session = useSession();
  const router = useRouter();
  const text_area_ref = useRef<ElementRef<"textarea">>(null);
  const blobs_qry = api.blob.get_blobs_for_user.useQuery();
  const api_utils = api.useUtils();
  const create_blob_mtn = api.blob.create_blob.useMutation({
    onMutate: async (blob_to_be_created) => {
      // Cancel outgoing fetches (so they don't overwrite our optimistic update)
      await api_utils.blob.get_blobs_for_user.cancel();
      set_content("");
      // Get the data from the queryCache
      const prev_data = api_utils.blob.get_blobs_for_user.getData();
      if (!prev_data) {
        console.log("'prev_data' is undefined");
        return { prev_data: [] };
      }
      // Optimistically update the data with our new blob
      api_utils.blob.get_blobs_for_user.setData(undefined, (old_blobs) => {
        if (!old_blobs) {
          console.log("'old_blobs' is undefined");
          return [];
        }
        const parent_blob = old_blobs.find(
          (blob) => blob.id === blob_to_be_created.parentId,
        );
        if (!parent_blob) {
          throw new Error("'parent_blob' is undefined");
        }
        let rand_id = Math.floor(Math.random() * 10_000);
        while (old_blobs.find((b) => b.id === rand_id)) {
          rand_id = Math.floor(Math.random() * 10_000);
        }
        const today = new Date();
        const new_blobs = [...old_blobs];
        new_blobs.push({
          ...blob_to_be_created,
          id: rand_id,
          createdAt: today,
          updatedAt: today,
          userId: session.data?.user.id ?? "",
          kids: null,
        });
        text_area_ref.current?.focus();
        return new_blobs;
      });
    },
    onError: (err, _, ctx) => {
      console.error(err);
      api_utils.blob.get_blobs_for_user.setData(undefined, ctx?.prev_data);
    },
    onSettled: () => {
      api_utils.blob.get_blobs_for_user.invalidate();
    },
  });
  const delete_blob_mtn = api.blob.delete_blob.useMutation();
  const [content, set_content] = useState("");
  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push(SIGN_IN_ROUTE);
    }
  }, [session.status]);

  useEffect(() => {
    if (blobs_qry.status === "success" && blobs_qry.data.length === 0) {
      create_blob_mtn.mutate({
        content: "",
        order: 0,
        parentId: null,
      });
      blobs_qry.refetch();
    }
  }, [blobs_qry.status]);

  if (
    blobs_qry.status === "error" ||
    typeof router.query.blob_parent_id !== "string"
  ) {
    return <div>Error...</div>;
  }
  if (session.status === "loading" || blobs_qry.status === "pending") {
    return (
      <div className="flex h-screen items-center justify-center p-1 md:p-4">
        <Spinner className="h-16 w-16 animate-spin-fast border-2" />
      </div>
    );
  }
  const blob_kids = get_blob_kids(blobs_qry.data, router.query.blob_parent_id);
  return (
    <Layout>
      <div className="flex flex-col gap-2 px-8 pb-4">
        <Breadcrumbs
          blobs={blobs_qry.data}
          blob_parent_id={router.query.blob_parent_id}
        />
        <div className="grow">
          <ul className="flex flex-wrap gap-2">
            {blob_kids.map((k) => {
              return (
                <li
                  key={k.id}
                  className="flex min-h-[10px] min-w-[60px] flex-col items-start items-end border p-1 text-card-foreground shadow-sm dark:bg-primary/20"
                >
                  <div className="px-4 pt-1">{k.content}</div>
                  <div className="flex items-center gap-2 pb-1 pl-4">
                    <EditDialogAndButton content={k.content ?? ""} id={k.id} />
                    <Link href={`/dashboard/${k.id}`}>
                      <Button
                        variant="ghost"
                        className="flex h-6 items-center p-1 opacity-50 hover:opacity-100 dark:hover:bg-primary/20"
                      >
                        {k.kids?.split(",").length ?? ""}
                        <ChevronRightIcon className="h-4 w-4 pt-1" />
                      </Button>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            ref={text_area_ref}
            className="resize-none text-base"
            value={content}
            onChange={(e) => set_content(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <Button
              disabled={
                content.trim().length === 0 ||
                content.length > 500 ||
                create_blob_mtn.status === "pending"
              }
              onClick={() => {
                create_blob_mtn.mutate({
                  content: content,
                  order: blob_kids.length,
                  parentId:
                    router.query.blob_parent_id === "root"
                      ? get_root_id(blobs_qry.data)
                      : parseInt(router.query.blob_parent_id as string),
                });
              }}
            >
              <SendHorizonalIcon />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Breadcrumbs({
  blobs,
  blob_parent_id,
}: {
  blobs: Array<BlobType>;
  blob_parent_id: string;
}) {
  const bc = [];
  let pid: number | null | undefined =
    blob_parent_id === "root" ? get_root_id(blobs) : parseInt(blob_parent_id);
  let idx = 0;
  while (pid !== null) {
    const c = blobs.find((b) => b.id === pid);
    bc.push(
      <BreadcrumbItem key={idx++}>
        <BreadcrumbLink asChild>
          <Link href={`/dashboard/${c?.id}`}>
            {get_label(c?.content ?? "")}
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>,
    );
    pid = c?.parentId;
    if (pid !== null) {
      bc.push(<BreadcrumbSeparator key={idx++} />);
    }
  }
  bc.push(
    <BreadcrumbItem key="root">
      <BreadcrumbLink asChild>
        <Link href="/dashboard/root">Root</Link>
      </BreadcrumbLink>
    </BreadcrumbItem>,
  );
  bc.reverse();
  return (
    <Breadcrumb>
      <BreadcrumbList>{bc}</BreadcrumbList>
    </Breadcrumb>
  );
}

function get_root_id(blobs: Array<BlobType>) {
  return blobs.find((b) => b.parentId === null)?.id ?? null;
}

function get_blob_kids(blobs: Array<BlobType>, blob_parent_id: string) {
  const pid =
    blob_parent_id === "root" ? get_root_id(blobs) : parseInt(blob_parent_id);
  return blobs
    .filter((b) => b.parentId === pid)
    .sort((a, b) => (a.order < b.order ? -1 : 1));
}

function get_label(content: string) {
  if (content.length > 16) {
    return `${content.substring(0, 16)}...`;
  } else {
    return content;
  }
}

export function EditDialogAndButton({
  id,
  content,
}: {
  id: number;
  content: string;
}) {
  const [open, set_open] = useState(false);
  const [edited_content, set_edited_content] = useState(content);
  const api_utils = api.useUtils();
  const edit_blob_mtn = api.blob.edit_blob_content.useMutation({
    onSuccess: () => {
      api_utils.blob.get_blobs_for_user.invalidate();
      set_open(false);
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(new_open) => {
        if (new_open) {
          set_edited_content(content);
        }
        set_open(new_open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="h-6 p-1 opacity-50 hover:opacity-100 dark:hover:bg-primary/20"
          title="Edit"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay className="background-blur bg-background/80" />
        <DialogPrimitive.Content
          className={cn(
            RADIX_MODAL_CONTENT_CLASSES,
            "fixed left-1/2 top-0 flex w-full -translate-x-1/2 flex-col gap-4 border bg-background",
            "p-4 md:top-1/2 md:w-[40rem] md:-translate-y-1/2 lg:p-8",
          )}
        >
          <VisuallyHidden.Root>
            <DialogTitle />
          </VisuallyHidden.Root>
          <VisuallyHidden.Root>
            <DialogDescription />
          </VisuallyHidden.Root>
          <EditContentTextArea
            edited_content={edited_content}
            set_edited_content={set_edited_content}
          />
          <DialogFooter className="flex justify-end gap-3">
            <DialogClose asChild>
              <Button className="w-20" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="w-20"
              disabled={
                edited_content.trim().length === 0 ||
                edited_content.trim().length > 500 ||
                edited_content.trim() === content
              }
              onClick={() => {
                edit_blob_mtn.mutate({
                  id: id,
                  content: edited_content.trim(),
                });
              }}
            >
              {edit_blob_mtn.status === "pending" ? (
                <Spinner className="h-4 w-4 animate-spin-fast border-2 text-white" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export function EditContentTextArea({
  edited_content,
  set_edited_content,
}: {
  edited_content: string;
  set_edited_content: (c: string) => void;
}) {
  const text_area_ref = useRef<ElementRef<"textarea">>(null);
  useEffect(() => {
    if (text_area_ref.current) {
      text_area_ref.current.focus();
      text_area_ref.current.setSelectionRange(
        edited_content.length,
        edited_content.length,
      );
    }
  }, [text_area_ref.current === null]);
  return (
    <Textarea
      ref={text_area_ref}
      className="h-[15rem] resize-none text-base md:h-[10rem]"
      value={edited_content}
      autoFocus
      onChange={(e) => set_edited_content(e.target.value)}
    />
  );
}

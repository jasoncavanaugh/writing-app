import { ChevronRightIcon, SendHorizonalIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import Layout from "~/components/Layout";
import { Spinner } from "~/components/Spinner";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import { SIGN_IN_ROUTE } from "~/lib/types";
import { getServerAuthSession } from "~/server/auth";
import { BlobType } from "~/server/db/schema";
import { api } from "~/utils/api";
import { GetServerSideProps } from "next/types";
import { useRouter } from "next/router";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerAuthSession(ctx);
  return {
    props: { session },
  };
};
export default function Dashboard() {
  const session = useSession();
  const router = useRouter();
  const blobs_qry = api.blob.get_blobs_for_user.useQuery();
  const create_blob_mtn = api.blob.create_blob.useMutation({
    onSuccess: () => {
      blobs_qry.refetch();
      set_content("");
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
                  className="flex min-h-[10px] flex-col items-start items-end bg-primary/20 p-1 text-card-foreground shadow-sm"
                >
                  <div className="px-4 pt-1">{k.content}</div>
                  <button
                    onClick={() => router.push(`/dashboard/${k.id}`)}
                    className="flex items-center opacity-40 hover:opacity-100"
                  >
                    {k.kids?.split(",").length ?? ""}
                    <ChevronRightIcon className="h-4 w-4 pt-1" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            disabled={create_blob_mtn.status === "pending"}
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
                // delete_blob_mtn.mutate({ id: 0 });
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
  let pid: any =
    blob_parent_id === "root" ? get_root_id(blobs) : parseInt(blob_parent_id);
  while (pid !== null) {
    console.log("pid", pid);
    const c = blobs.find((b) => b.id === pid);
    bc.push(
      <BreadcrumbItem>
        <BreadcrumbLink href={`/dashboard/${c?.id}`}>
          {get_label(c?.content ?? "")}
        </BreadcrumbLink>
      </BreadcrumbItem>,
    );
    pid = c?.parentId;
    if (pid !== null) {
      bc.push(<BreadcrumbSeparator />);
    }
  }
  bc.push(
    <BreadcrumbItem>
      <BreadcrumbLink href="/dashboard/root">Root</BreadcrumbLink>
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
  console.log("blobs", blobs);
  return blobs.find((b) => b.parentId === null)?.id ?? null;
}

function get_blob_kids(blobs: Array<BlobType>, blob_parent_id: string) {
  const pid =
    blob_parent_id === "root" ? get_root_id(blobs) : parseInt(blob_parent_id);
  return blobs
    .filter((b) => b.parentId === pid)
    .sort((a, b) => (a.order < b.order ? -1 : 1));
  // if (!parent_blob || !parent_blob.kids) {
  //   return [];
  // }
  // const kidIds = parent_blob.kids.split(",").map((k) => parseInt(k));
  // return blobs.filter((b) => kidIds.some((k) => k === b.id));
}

function get_label(content: string) {
  if (content.length > 16) {
    return `${content.substring(0, 16)}...`;
  } else {
    return content;
  }
}

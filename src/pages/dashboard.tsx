import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SIGN_IN_ROUTE } from "~/lib/types";
import { getServerAuthSession } from "~/server/auth";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerAuthSession(ctx);
  return {
    props: { session },
  };
};
export default function Dashboard() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push(SIGN_IN_ROUTE);
    }
  }, [session.status]);
  if (session.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center p-1 md:p-4">
        <Spinner className="animate-spin-fast h-16 w-16 border-2" />
      </div>
    );
  }
  return (
    <Layout>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1">
                <BreadcrumbEllipsis className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Documentation</DropdownMenuItem>
                <DropdownMenuItem>Themes</DropdownMenuItem>
                <DropdownMenuItem>GitHub</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/docs/components">Components</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </Layout>
  );
}

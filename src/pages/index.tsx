import { signIn, signOut, useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "~/components/Layout";
import { cn } from "~/lib/utils";

import { api } from "~/utils/api";
import { DASHBOARD_ROUTE, SIGN_IN_ROUTE } from "~/lib/types";
import { Spinner } from "~/components/Spinner";
import { useEffect } from "react";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "~/server/auth";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerAuthSession(ctx);
  return {
    props: { session },
  };
};
export default function Home() {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "authenticated") {
      router.push(DASHBOARD_ROUTE);
    } else if (session.status === "unauthenticated") {
      router.push(SIGN_IN_ROUTE);
    }
  }, [session.status]);

  return (
    <div className="flex h-screen items-center justify-center p-1 md:p-4">
      <Spinner className="animate-spin-fast h-16 w-16 border-2" />
    </div>
  );
}
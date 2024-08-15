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

function AuthShowcase() {
  const { data: sessionData } = useSession();

  const { data: secretMessage } = api.post.getSecretMessage.useQuery(
    undefined, // no input
    { enabled: sessionData?.user !== undefined },
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {sessionData && <span>Logged in as {sessionData.user?.name}</span>}
        {secretMessage && <span> - {secretMessage}</span>}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
        onClick={sessionData ? () => void signOut() : () => void signIn()}
      >
        {sessionData ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
}

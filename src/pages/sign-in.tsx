import { ModeToggle } from "~/components/mode-toggle";
import { Button } from "~/components/ui/button";
import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { DASHBOARD_ROUTE, SIGN_IN_ROUTE } from "~/lib/types";
import { GetServerSideProps } from "next";
import { getServerAuthSession } from "~/server/auth";
import { Spinner } from "~/components/Spinner";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerAuthSession(ctx);
  return {
    props: { session },
  };
};
export default function SignIn() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session.status === "authenticated") {
      router.push(DASHBOARD_ROUTE);
    }
  }, [session.status]);

  console.log("session.status", session.status);
  if (session.status === "loading" || session.status === "authenticated") {
    return (
      <div className="flex h-screen items-center justify-center p-1 md:p-4">
        <Spinner className="animate-spin-fast h-16 w-16 border-2" />
      </div>
    );
  }
  return (
    <div className="flex h-screen flex-col p-4">
      <div className="flex grow items-center justify-center">
        <Button onClick={() => void signIn()}>Sign In</Button>
      </div>
    </div>
  );
}

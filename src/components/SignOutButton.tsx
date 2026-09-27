"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg px-4 py-2 text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-800 hover:text-white"
    >
      Sign out
    </button>
  );
}

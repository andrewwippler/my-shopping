import React, { useState } from "react";
import Layout from "@/components/Layout";
import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <Layout>
<div className="flex items-center justify-center">
  <button
    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors"
    onClick={() => signIn("dex")}
  >
    Sign in to Wippler Auth
  </button>
</div>
    </Layout>
  );
}

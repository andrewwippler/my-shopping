import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth"

// Extend the Session type to include accessToken
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}



export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "dex",
      name: "Dex",
      type: "oauth",
      clientId: process.env.DEX_CLIENT_ID,
      clientSecret: process.env.DEX_CLIENT_SECRET,
      wellKnown: process.env.DEX_URL + "/.well-known/openid-configuration",
      authorization: { params: { scope: "openid email profile" } },
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
        }
      },
    },
  ],
  session: {
    strategy: "jwt", // or "database" if you want persistent sessions
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // always redirect to homepage after signin
      return "/";
    },
  },
}

export default NextAuth(authOptions);

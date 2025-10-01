import Layout from '@/components/Layout'
import ShoppingList from '@/components/ShoppingList';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";

export default function Home({ session }: any) {

  return (
    <Layout>
      <ShoppingList />
    </Layout>
  )
}


export async function getServerSideProps(context: any) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // Fix undefined image
  if (session.user) {
    session.user.image = session.user.image ?? null;
  }

  return {
    props: { session },
  };
}